/**
 * Capacitor runtime helpers.
 *
 * Every function gracefully no-ops or falls back to a web equivalent
 * when the app is running in a regular browser (i.e. not inside the
 * Capacitor WebView). This means components that import from here
 * stay simple — call the function regardless of platform.
 */

import type { Photo } from '@capacitor/camera';

let _isNativeCache: boolean | null = null;

/** True when running inside the Capacitor native shell (iOS or Android). */
export function isNative(): boolean {
  if (_isNativeCache !== null) return _isNativeCache;
  if (typeof window === 'undefined') return false;
  // Capacitor exposes window.Capacitor when present
  // We dynamic-import below; this is a cheap synchronous check.
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  _isNativeCache = !!cap?.isNativePlatform?.();
  return _isNativeCache;
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.() || 'web';
  return p === 'ios' || p === 'android' ? p : 'web';
}

/* ------------------------------------------------------------------ */
/*  CAMERA / PHOTO PICKER                                             */
/* ------------------------------------------------------------------ */

export interface PickedPhoto {
  /** Blob ready to append to FormData. */
  blob: Blob;
  /** Suggested filename (with extension). */
  fileName: string;
  /** MIME type (e.g. "image/jpeg"). */
  mimeType: string;
}

export type PhotoSource = 'camera' | 'library' | 'prompt';

/**
 * Capture a photo (native camera) or pick one from the library.
 * On web, falls back to opening the supplied <input type="file"> element.
 *
 * Usage in a component:
 *   const photo = await pickOrCapturePhoto({ source: 'prompt', fileInputRef });
 *   if (photo) { fd.append('file', photo.blob, photo.fileName); }
 */
export async function pickOrCapturePhoto(opts: {
  source?: PhotoSource;
  /** Required for web fallback. */
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  /** Max edge length; the camera plugin downscales accordingly. */
  maxSize?: number;
}): Promise<PickedPhoto | null> {
  const source: PhotoSource = opts.source || 'prompt';

  if (isNative()) {
    const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
    const cameraSource =
      source === 'camera' ? CameraSource.Camera :
      source === 'library' ? CameraSource.Photos :
      CameraSource.Prompt;

    let result: Photo;
    try {
      result = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: cameraSource,
        width: opts.maxSize,
        height: opts.maxSize,
      });
    } catch (err) {
      // User cancelled or denied permission
      console.warn('Camera cancelled or denied:', err);
      return null;
    }

    if (!result.dataUrl) return null;
    const blob = await (await fetch(result.dataUrl)).blob();
    const ext = result.format || 'jpeg';
    return {
      blob,
      fileName: `photo-${Date.now()}.${ext}`,
      mimeType: blob.type || `image/${ext}`,
    };
  }

  // Web fallback: trigger the supplied file input
  if (!opts.fileInputRef?.current) {
    console.warn('pickOrCapturePhoto on web requires a fileInputRef');
    return null;
  }
  return new Promise<PickedPhoto | null>((resolve) => {
    const input = opts.fileInputRef!.current!;
    const onChange = () => {
      input.removeEventListener('change', onChange);
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ blob: file, fileName: file.name, mimeType: file.type || 'image/jpeg' });
      // Reset so the same file can be picked again later
      input.value = '';
    };
    input.addEventListener('change', onChange);
    input.click();
  });
}

/* ------------------------------------------------------------------ */
/*  NATIVE PUSH TOKEN REGISTRATION                                    */
/* ------------------------------------------------------------------ */

/**
 * Request notification permission and register the device's FCM token
 * with our backend. Safe to call on web — no-ops there.
 *
 * On iOS, Firebase converts the APNs token to an FCM token under the
 * hood, so we get one unified token format server-side.
 */
export async function registerNativePushToken(): Promise<{
  ok: boolean;
  reason?: 'web' | 'denied' | 'error';
  token?: string;
}> {
  if (!isNative()) return { ok: false, reason: 'web' };

  const { PushNotifications } = await import('@capacitor/push-notifications');

  // 1. Ask for permission (system dialog on first call)
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  // 2. Register with APNs / FCM
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: { ok: boolean; reason?: 'error'; token?: string }) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    PushNotifications.addListener('registration', async (tokenData) => {
      const token = tokenData.value;
      try {
        const platform = getPlatform();
        const res = await fetch('/api/push/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform }),
        });
        if (!res.ok) throw new Error('register failed');
        finish({ ok: true, token });
      } catch (err) {
        console.error('Failed to persist push token:', err);
        finish({ ok: false, reason: 'error' });
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
      finish({ ok: false, reason: 'error' });
    });

    PushNotifications.register().catch((err) => {
      console.error('Push register call failed:', err);
      finish({ ok: false, reason: 'error' });
    });

    // Safety timeout — APNs registration occasionally hangs
    setTimeout(() => finish({ ok: false, reason: 'error' }), 15_000);
  });
}

/**
 * Wire foreground / tap handlers for native push notifications.
 * Call once at app bootstrap (inside PortalShell or layout).
 */
export async function attachPushHandlers(opts: {
  onTap?: (data: Record<string, unknown>) => void;
  onForeground?: (notif: { title?: string; body?: string; data: Record<string, unknown> }) => void;
}) {
  if (!isNative()) return;
  const { PushNotifications } = await import('@capacitor/push-notifications');

  PushNotifications.addListener('pushNotificationReceived', (notif) => {
    opts.onForeground?.({
      title: notif.title,
      body: notif.body,
      data: (notif.data || {}) as Record<string, unknown>,
    });
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    opts.onTap?.((action.notification?.data || {}) as Record<string, unknown>);
  });
}
