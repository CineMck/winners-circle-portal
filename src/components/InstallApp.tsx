'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// "Get the app" block for the login screen — lets members install the PWA on
// iPhone (Add to Home Screen) or Android (native install prompt). No app store.
export default function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [help, setHelp] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleAndroid() {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
    } else {
      setHelp(h => (h === 'android' ? null : 'android'));
    }
  }

  const tileStyle: React.CSSProperties = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    background: 'var(--black-elevated, #161616)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '16px 12px', cursor: 'pointer', color: 'var(--text)',
  };

  return (
    <div className="install-app-wrap" style={{ marginTop: '24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
        <span style={{ color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>GET THE APP</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {/* iPhone / iPad */}
        <button type="button" style={tileStyle} onClick={() => setHelp(h => (h === 'ios' ? null : 'ios'))}>
          <svg width="26" height="26" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>iPhone &amp; iPad</span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Add to Home Screen</span>
        </button>

        {/* Android */}
        <button type="button" style={tileStyle} onClick={handleAndroid}>
          <svg width="26" height="26" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
            <path d="M420.55 301.93a24 24 0 1 1 24-24 24 24 0 0 1-24 24m-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1-24 24m273.7-144.48 47.94-83a10 10 0 1 0-17.27-10l-48.54 84.07a301.25 301.25 0 0 0-246.56 0L116.18 64.45a10 10 0 1 0-17.27 10l47.94 83C64.53 202.22 8.24 285.55 0 384h576c-8.24-98.45-64.54-181.78-146.85-226.55" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>Android</span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{deferred ? 'Tap to install' : 'Install from Chrome'}</span>
        </button>
      </div>

      {help === 'ios' && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
          On your iPhone, open this page in <strong style={{ color: 'var(--text)' }}>Safari</strong>, tap the
          {' '}<strong style={{ color: 'var(--text)' }}>Share</strong> icon, then choose
          {' '}<strong style={{ color: 'var(--text)' }}>“Add to Home Screen.”</strong>
        </p>
      )}
      {help === 'android' && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
          On your Android phone, open this page in <strong style={{ color: 'var(--text)' }}>Chrome</strong>, tap the
          {' '}<strong style={{ color: 'var(--text)' }}>⋮ menu</strong>, then choose
          {' '}<strong style={{ color: 'var(--text)' }}>“Install app.”</strong>
        </p>
      )}

      {/* Hidden automatically when already installed (running as a standalone app). */}
      <style>{`@media (display-mode: standalone){.install-app-wrap{display:none !important;}}`}</style>
    </div>
  );
}
