'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Logo from '@/components/Logo';

/**
 * Page users land on after clicking the password-reset link in their email.
 * Supabase has already exchanged the link for a session by the time the
 * client-side createClient() loads — so all we need to do is collect the
 * new password and call auth.updateUser().
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSessionOk(!!session);
    })();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords don\'t match'); return; }
    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
    // Brief delay so they see the success message
    setTimeout(() => { window.location.href = '/home'; }, 1500);
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--black-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Logo size={72} ring style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>
            Set a new password
          </h1>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          {sessionOk === null ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>Loading…</p>
          ) : !sessionOk ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>
                This reset link is invalid or has expired.
              </p>
              <Link href="/forgot-password" style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '13px' }}>
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Password updated</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Redirecting to your portal…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', padding: '12px', color: '#ef4444', fontSize: '13px',
                }}>{error}</div>
              )}
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>
                  New password
                </label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters" required autoFocus
                  style={{
                    width: '100%', background: 'var(--black-elevated, #161616)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>
                  Confirm new password
                </label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password" required
                  style={{
                    width: '100%', background: 'var(--black-elevated, #161616)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
