/**
 * Direct APNs (Apple Push Notification service) sender.
 *
 * Used because @capacitor/push-notifications on iOS returns raw APNs device
 * tokens — not FCM tokens. firebase-admin can't send to those directly, so
 * we talk to APNs over HTTP/2 ourselves using the .p8 auth key.
 *
 * Required env vars:
 *   APNS_KEY_ID     — 10-char key ID from Apple Dev Portal
 *   APNS_TEAM_ID    — 10-char team ID from Apple Dev Portal
 *   APNS_BUNDLE_ID  — your iOS app's bundle ID (e.g. com.neuluma.winnerscircle)
 *   APNS_AUTH_KEY   — base64-encoded contents of the .p8 file
 *   APNS_PRODUCTION — "true" for App Store builds, "false" for Xcode/TestFlight builds
 */

import apn from '@parse/node-apn';

let _provider: apn.Provider | null = null;

function loadAuthKey(): string {
  const raw = process.env.APNS_AUTH_KEY;
  if (!raw) throw new Error('APNS_AUTH_KEY env var is not set');
  let key = raw.trim();
  if (!key.startsWith('-----BEGIN')) {
    // Stored as base64 — decode to the PEM string
    key = Buffer.from(key, 'base64').toString('utf-8');
  }
  return key;
}

function getProvider(): apn.Provider {
  if (_provider) return _provider;

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!keyId) throw new Error('APNS_KEY_ID env var is not set');
  if (!teamId) throw new Error('APNS_TEAM_ID env var is not set');

  _provider = new apn.Provider({
    token: {
      key: loadAuthKey(),
      keyId,
      teamId,
    },
    production: process.env.APNS_PRODUCTION === 'true',
  });
  return _provider;
}

export interface ApnsPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

export interface ApnsResult {
  sent: number;
  failed: number;
  stale: string[];
}

export async function sendApnsToTokens(
  deviceTokens: string[],
  payload: ApnsPayload
): Promise<ApnsResult> {
  if (deviceTokens.length === 0) return { sent: 0, failed: 0, stale: [] };

  const bundleId = process.env.APNS_BUNDLE_ID;
  if (!bundleId) throw new Error('APNS_BUNDLE_ID env var is not set');

  const provider = getProvider();
  const notification = new apn.Notification();
  notification.alert = { title: payload.title, body: payload.body };
  notification.topic = bundleId;
  notification.sound = 'default';
  notification.contentAvailable = false;
  notification.priority = 10;
  // Merge custom payload + url
  const extra: Record<string, string> = { ...(payload.data || {}) };
  if (payload.url) extra.url = payload.url;
  notification.payload = extra;

  const response = await provider.send(notification, deviceTokens);

  const stale: string[] = [];
  response.failed.forEach((f) => {
    const reason = (f.response as { reason?: string } | undefined)?.reason;
    const status = (f as { status?: string }).status;
    // 410 = device token no longer valid (uninstalled, etc.) — prune
    if (reason === 'BadDeviceToken' || reason === 'Unregistered' || status === '410') {
      stale.push(f.device);
    }
    console.warn('[apns] delivery failed:', { device: f.device.slice(0, 12) + '…', status, reason });
  });

  return {
    sent: response.sent.length,
    failed: response.failed.length,
    stale,
  };
}

/** Cleanly tear down the HTTP/2 connection — call from tests or on shutdown. */
export function shutdownApns() {
  if (_provider) {
    _provider.shutdown();
    _provider = null;
  }
}
