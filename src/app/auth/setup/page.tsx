'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [stage, setStage] = useState<'loading' | 'setup' | 'error' | 'done'>('loading');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase JS automatically exchanges the #access_token hash on init.
    // We just wait for the session to be ready.
    const check = async () => {
      // Give the client a moment to process the hash
      await new Promise(r => setTimeout(r, 800));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Pre-fill name from email if available
        const emailName = session.user.email?.split('@')[0] || '';
        setFullName(emailName.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        setStage('setup');
      } else {
        setStage('error');
      }
    };
    check();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setSaving(true);
    try {
      // Set password
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) { setError(pwErr.message); setSaving(false); return; }

      // Update profile name + username
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        await supabase.from('profiles').update({
          full_name: fullName.trim(),
          username,
        }).eq('id', user.id);
      }

      setStage('done');
      setTimeout(() => router.push('/home'), 1500);
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏆</div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#c9a84c', letterSpacing: '-0.5px' }}>
            The Winner&apos;s Circle
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Private Mastermind Community
          </p>
        </div>

        <div style={{
          background: '#111', border: '1px solid #1e1e1e', borderTop: '3px solid #c9a84c',
          borderRadius: '16px', padding: '36px',
        }}>

          {stage === 'loading' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: '#888', fontSize: '14px' }}>Verifying your invitation…</p>
            </div>
          )}

          {stage === 'error' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚠️</div>
              <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '18px' }}>Invite Link Expired</h2>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6 }}>
                This invite link is invalid or has expired. Please ask your admin to send a new invite.
              </p>
              <a href="/login" style={{
                display: 'inline-block', marginTop: '20px', padding: '10px 24px',
                background: '#c9a84c', color: '#0a0a0a', fontWeight: 700,
                borderRadius: '8px', textDecoration: 'none', fontSize: '14px',
              }}>
                Go to Sign In
              </a>
            </div>
          )}

          {stage === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ color: '#c9a84c', marginBottom: '8px', fontSize: '20px' }}>Welcome to the Circle!</h2>
              <p style={{ color: '#888', fontSize: '14px' }}>Taking you to your dashboard…</p>
            </div>
          )}

          {stage === 'setup' && (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                Welcome! Let&apos;s get you set up
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#888' }}>
                Set your name and a password to activate your account.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Smith"
                    required
                    style={{
                      width: '100%', background: '#161616', border: '1px solid #2a2a2a',
                      borderRadius: '10px', padding: '12px 14px', color: '#fff',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    style={{
                      width: '100%', background: '#161616', border: '1px solid #2a2a2a',
                      borderRadius: '10px', padding: '12px 14px', color: '#fff',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    style={{
                      width: '100%', background: '#161616', border: '1px solid #2a2a2a',
                      borderRadius: '10px', padding: '12px 14px', color: '#fff',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
                    fontSize: '13px', color: '#ef4444',
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    width: '100%', background: saving ? '#8a6e2a' : '#c9a84c',
                    color: '#0a0a0a', border: 'none', borderRadius: '10px',
                    padding: '14px', fontSize: '15px', fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.3px',
                  }}
                >
                  {saving ? 'Activating…' : 'Activate My Account →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
