'use client';

import { useState } from 'react';
import Link from 'next/link';

type Platform = 'ios' | 'android';

type Step = { n: number; title: string; body: string; icon: React.ReactNode };

const ShareIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
  </svg>
);
const DotsIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
  </svg>
);
const PlusSquare = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" />
  </svg>
);
const SafariIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" stroke="none" />
  </svg>
);
const ChromeIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" /><path d="M21 8h-9M3.8 7.5l4.5 7.8M14.2 21l4.5-7.8" />
  </svg>
);
const DownloadIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);

const STEPS: Record<Platform, Step[]> = {
  ios: [
    { n: 1, title: 'Open in Safari', body: "Make sure you're using Safari — not Chrome or an in-app browser. Go to winnerscircleportal.com.", icon: SafariIcon },
    { n: 2, title: 'Tap the Share button', body: 'It’s the square with an arrow pointing up, in the toolbar at the bottom (or top) of Safari.', icon: ShareIcon },
    { n: 3, title: 'Add to Home Screen', body: 'Scroll down the share menu, tap “Add to Home Screen,” then tap “Add.” The Winners Circle icon appears on your home screen.', icon: PlusSquare },
  ],
  android: [
    { n: 1, title: 'Open in Chrome', body: 'Go to winnerscircleportal.com in the Chrome browser.', icon: ChromeIcon },
    { n: 2, title: 'Tap the menu', body: 'Tap the three-dot ⋮ menu in the top-right corner of Chrome.', icon: DotsIcon },
    { n: 3, title: 'Install app', body: 'Tap “Install app” (or “Add to Home screen”), then confirm. The app lands on your home screen.', icon: DownloadIcon },
  ],
};

export default function InstallGuidePage() {
  const [tab, setTab] = useState<Platform>('ios');
  const steps = STEPS[tab];

  const tabBtn = (p: Platform): React.CSSProperties => ({
    flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)',
    background: tab === p ? 'var(--gold)' : 'transparent',
    color: tab === p ? '#0a0a0a' : 'var(--muted)',
    fontWeight: 800, fontSize: '14px', cursor: 'pointer',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black-bg)', padding: '32px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '34px', marginBottom: '8px' }}>🏆</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)', margin: '0 0 6px', fontFamily: 'var(--font-brand), Georgia, serif', letterSpacing: '0.05em' }}>
            Install the App
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            Add The Winners Circle to your home screen — it opens like a real app, no app store needed.
          </p>
        </div>

        {/* Platform toggle */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button type="button" style={tabBtn('ios')} onClick={() => setTab('ios')}>iPhone &amp; iPad</button>
          <button type="button" style={tabBtn('android')} onClick={() => setTab('android')}>Android</button>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {steps.map(s => (
            <div key={s.n} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'var(--black-card, #111)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
                <div style={{ position: 'absolute', top: -8, left: -8, width: 22, height: 22, borderRadius: '50%', background: 'var(--gold)', color: '#0a0a0a', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.n}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{s.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
            Once it&apos;s on your home screen, open it from there and sign in like normal.
          </p>
          <Link href="/login" style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
