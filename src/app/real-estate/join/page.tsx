'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function RealEstateJoinPage() {
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setChecking(false);
    });
  }, [supabase]);

  async function startCheckout() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/re-promo-checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black-bg, #0a0a0a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Logo size={64} ring style={{ margin: '0 auto 14px' }} />
          <h1 style={{ fontSize: '24px', color: 'var(--gold)', fontFamily: 'var(--font-brand, Georgia), serif', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            The Winners Circle
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>Real Estate Mastermind Membership</p>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Membership pricing</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>Full access to the community, courses, challenges, and events.</p>

          <div style={{ background: '#161616', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px' }}>First 4 months</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold)' }}>$300 total</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '14px' }}>Then ongoing</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold)' }}>$150 / month</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px' }}>
              $300 is charged today and covers your first 4 months. Billing then continues at $150/month. Cancel anytime.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
          )}

          {checking ? (
            <button disabled className="btn-gold" style={{ width: '100%', padding: '13px', fontSize: '15px', opacity: 0.6 }}>Loading…</button>
          ) : signedIn ? (
            <button onClick={startCheckout} disabled={loading} className="btn-gold" style={{ width: '100%', padding: '13px', fontSize: '15px' }}>
              {loading ? 'Starting checkout…' : 'Start membership →'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/signup?next=/real-estate/join" className="btn-gold" style={{ width: '100%', padding: '13px', fontSize: '15px', textAlign: 'center', textDecoration: 'none' }}>
                Create your account
              </Link>
              <Link href="/login?next=/real-estate/join" style={{ textAlign: 'center', color: 'var(--gold)', fontSize: '13px', textDecoration: 'none' }}>
                Already a member? Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
