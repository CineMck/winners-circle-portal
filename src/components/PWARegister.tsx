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

    // When launched as an installed PWA (Add to Home Screen), apply the same
    // safe-area insets the native app uses so content clears the status bar/notch.
    // In a normal browser tab this is skipped (the browser chrome handles it).
    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (isStandalone) {
      document.body.classList.add('has-safe-area');
    }
  }, []);
  return null;
}
