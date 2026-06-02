/**
 * Lazy-initialised Firebase Admin singleton.
 *
 * Loads service-account credentials from FIREBASE_SERVICE_ACCOUNT_JSON
 * (a single env var holding the entire JSON contents, base64-encoded or raw).
 *
 * Set this in Railway:
 *   1. Project → Service account → Generate new private key (downloads JSON)
 *   2. `cat <file>.json | base64 | pbcopy`
 *   3. Set FIREBASE_SERVICE_ACCOUNT_JSON to the base64 string in Railway → Variables
 */

import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

let _app: App | null = null;
let _messaging: Messaging | null = null;

function loadServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set');
  }
  let jsonStr = raw.trim();
  if (!jsonStr.startsWith('{')) {
    // Assume base64
    jsonStr = Buffer.from(jsonStr, 'base64').toString('utf-8');
  }
  return JSON.parse(jsonStr);
}

export function getFirebaseMessaging(): Messaging {
  if (_messaging) return _messaging;

  if (!_app) {
    const existing = getApps()[0];
    if (existing) {
      _app = existing;
    } else {
      _app = initializeApp({
        credential: cert(loadServiceAccount() as Parameters<typeof cert>[0]),
      });
    }
  }
  _messaging = getMessaging(_app);
  return _messaging;
}
