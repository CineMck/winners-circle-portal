'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    fetch('/api/unsubscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => setState(r.ok ? 'done' : 'error'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif' }}>
      <div style={{ maxWidth: 420, textAlign: 'center', color: '#f5f5f5' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#c9a84c', marginBottom: 16 }}>THE WINNERS CIRCLE</div>
        {state === 'loading' && <p style={{ color: '#bbb' }}>Updating your preferences…</p>}
        {state === 'done' && (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>You&apos;re unsubscribed</h1>
            <p style={{ color: '#bbb', fontSize: 14 }}>You won&apos;t receive any more Real Estate Mastermind marketing emails. You can re-register anytime on the Real Estate page.</p>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Link not valid</h1>
            <p style={{ color: '#bbb', fontSize: 14 }}>This unsubscribe link is invalid or expired. Please use the link from a recent email.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
