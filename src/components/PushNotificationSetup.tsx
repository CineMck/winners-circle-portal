'use client';
import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export default function PushNotificationSetup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'>('idle');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported'); return;
    }
    if (Notification.permission === 'granted') setStatus('granted');
    else if (Notification.permission === 'denied') setStatus('denied');
    else setStatus('idle');

    // Check if already dismissed this session
    if (sessionStorage.getItem('push-dismissed')) setDismissed(true);

    // Register service worker
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }, []);

  async function enableNotifications() {
    setStatus('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('denied'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      setStatus('granted');
    } catch (err) {
      console.error('Push enable error:', err);
      setStatus('denied');
    }
  }

  function dismiss() {
    sessionStorage.setItem('push-dismissed', '1');
    setDismissed(true);
  }

  if (status === 'unsupported' || status === 'granted' || status === 'denied' || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
      background: '#111', border: '1px solid var(--gold)',
      borderRadius: '14px', padding: '16px 18px', maxWidth: '320px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.3s ease',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '24px', flexShrink: 0 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Stay in the loop</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '12px' }}>
            Get notified about new messages, upcoming sessions, and announcements.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={enableNotifications} disabled={status === 'loading'} className="btn-gold"
              style={{ padding: '8px 16px', fontSize: '12px', flex: 1 }}>
              {status === 'loading' ? 'Enabling…' : 'Enable Notifications'}
            </button>
            <button onClick={dismiss} style={{ padding: '8px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
