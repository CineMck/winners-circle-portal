'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isNative, registerNativePushToken, attachPushHandlers } from '@/lib/native';

/**
 * Mount once near the top of the authenticated app (e.g. inside PortalShell).
 *
 * - Asks for native push permission and registers the device's FCM token.
 * - Wires foreground notifications (showing an in-app toast is the parent's job).
 * - When the user taps a notification, routes to the URL in its `data.url`.
 *
 * Renders nothing. On web (not inside the Capacitor shell) it no-ops.
 */
export default function NativePushBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    (async () => {
      // Fire-and-forget; failures are logged inside the helper
      const result = await registerNativePushToken();
      if (cancelled) return;
      if (!result.ok && result.reason === 'denied') {
        console.info('User denied push permission');
      }

      await attachPushHandlers({
        onTap: (data) => {
          const url = typeof data.url === 'string' ? data.url : null;
          if (url) router.push(url);
        },
        onForeground: (notif) => {
          // For now, just log. To show an in-app banner, wire your toast system here.
          console.info('Foreground push:', notif.title, notif.body);
        },
      });
    })();

    return () => { cancelled = true; };
  }, [router]);

  return null;
}
