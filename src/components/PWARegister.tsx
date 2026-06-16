'use client';

import { useEffect } from 'react';

// Registers the service worker on every page (including public ones like /login)
// so the app qualifies as an installable PWA. Safe alongside PushNotificationSetup
// — service worker registration is idempotent.
export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
