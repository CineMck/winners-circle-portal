'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/home';
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://winnerscircleportal.com/auth/callback' },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setMagicSent(true);
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--black-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Logo size={72} ring style={{ margin: '0 auto 16px' }} />
          <h1 style={{
            fontSize: '26px', color: 'var(--gold)', marginBottom: '6px',
            fontFamily: 'var(--font-brand), Georgia, serif',
            fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            The Winners Circle
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Sign in to your member portal</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          {magicSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Check your email</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                We sent a magic link to <strong style={{ color: 'var(--text)' }}>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', padding: '12px', color: '#ef4444', fontSize: '13px',
                }}>{error}</div>
              )}
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>
                  Email
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  style={{
                    width: '100%', background: 'var(--black-elevated, #161616)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    style={{ fontSize: '12px', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', background: 'var(--black-elevated, #161616)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>OR</span>
                <hr style={{ flex: 1, borderColor: 'var(--border)' }} />
              </div>
              <button type="button" onClick={handleMagicLink} disabled={loading} className="btn-outline"
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}>
                Send Magic Link
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: '14px' }}>
          Not a member?{' '}
          <Link href="/signup" style={{ color: 'var(--gold)', fontWeight: 600 }}>
            Join the Winner&apos;s Circle
          </Link>
        </p>
      </div>
    </div>
  );
}
