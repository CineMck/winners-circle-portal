'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const INDUSTRIES = [
  'Real Estate',
  'Finance & Investing',
  'Entrepreneurship / Business',
  'Technology',
  'Healthcare',
  'Legal',
  'Marketing & Advertising',
  'Consulting',
  'E-Commerce & Retail',
  'Construction & Trades',
  'Education & Coaching',
  'Insurance',
  'Manufacturing',
  'Non-Profit',
  'Other',
];

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161616', border: '1px solid #2a2a2a',
  borderRadius: '10px', padding: '12px 14px', color: '#fff',
  fontSize: '15px', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, color: '#888',
  marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
};

export default function SetupPage() {
  const router = useRouter();
  const supabase = createClient();

  // Stage: loading | step1 | step2 | error | done
  const [stage, setStage] = useState<'loading' | 'step1' | 'step2' | 'error' | 'done'>('loading');

  // Step 1 fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Step 2 fields
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [goals12, setGoals12] = useState('');
  const [goals30, setGoals30] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const check = async () => {
      await new Promise(r => setTimeout(r, 800));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const emailName = session.user.email?.split('@')[0] || '';
        setFullName(emailName.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        setStage('step1');
      } else {
        setStage('error');
      }
    };
    check();
  }, []);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setSaving(true);
    try {
      // Set password now so they're authenticated going forward
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) { setError(pwErr.message); setSaving(false); return; }

      // Save name & username to profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        await supabase.from('profiles').update({ full_name: fullName.trim(), username }).eq('id', user.id);
      }

      setSaving(false);
      setStage('step2');
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!industry) { setError('Please select your industry.'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          industry: industry || null,
          phone: phone.trim() || null,
          birthday: birthday || null,
          goals_12_months: goals12.trim() || null,
          goals_30_days: goals30.trim() || null,
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
      <div style={{ width: '100%', maxWidth: '440px' }}>

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

          {/* Loading */}
          {stage === 'loading' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⏳</div>
              <p style={{ color: '#888', fontSize: '14px' }}>Verifying your invitation…</p>
            </div>
          )}

          {/* Error */}
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

          {/* Done */}
          {stage === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ color: '#c9a84c', marginBottom: '8px', fontSize: '20px' }}>Welcome to the Circle!</h2>
              <p style={{ color: '#888', fontSize: '14px' }}>Taking you to your dashboard…</p>
            </div>
          )}

          {/* Step 1: Name + Password */}
          {stage === 'step1' && (
            <>
              {/* Progress indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#0a0a0a' }}>1</div>
                  <span style={{ fontSize: '12px', color: '#c9a84c', fontWeight: 600 }}>Account</span>
                </div>
                <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#888' }}>2</div>
                  <span style={{ fontSize: '12px', color: '#555', fontWeight: 600 }}>Profile</span>
                </div>
              </div>

              <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                Welcome! Let&apos;s get you set up
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#888' }}>
                Set your name and a password to activate your account.
              </p>

              <form onSubmit={handleStep1}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Your Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Smith"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    style={inputStyle}
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
                  {saving ? 'Saving…' : 'Continue →'}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Profile Questions */}
          {stage === 'step2' && (
            <>
              {/* Progress indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2a5a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>✓</div>
                  <span style={{ fontSize: '12px', color: '#555', fontWeight: 600 }}>Account</span>
                </div>
                <div style={{ flex: 1, height: '1px', background: '#c9a84c' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#0a0a0a' }}>2</div>
                  <span style={{ fontSize: '12px', color: '#c9a84c', fontWeight: 600 }}>Profile</span>
                </div>
              </div>

              <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>
                Tell us about yourself
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#888' }}>
                Help us personalise your experience in the Circle.
              </p>

              <form onSubmit={handleStep2}>
                {/* Industry */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>What industry are you in? <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    required
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                      paddingRight: '36px',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select your industry…</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Phone Number <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    style={inputStyle}
                  />
                </div>

                {/* Birthday */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Birthday <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={e => setBirthday(e.target.value)}
                    style={{
                      ...inputStyle,
                      colorScheme: 'dark',
                    }}
                  />
                </div>

                {/* 12-month goals */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>What are your goals for the next 12 months?</label>
                  <textarea
                    value={goals12}
                    onChange={e => setGoals12(e.target.value)}
                    placeholder="e.g. Close $5M in real estate deals, build a team of 10, launch a new product line…"
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      lineHeight: '1.5',
                    }}
                  />
                </div>

                {/* 30-day goals */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>What are your goals for the next 30 days?</label>
                  <textarea
                    value={goals30}
                    onChange={e => setGoals30(e.target.value)}
                    placeholder="e.g. Close 2 deals, complete the 75 Hard challenge, finish the sales course…"
                    rows={3}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      lineHeight: '1.5',
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

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Skip step 2 and go straight to home
                      router.push('/home');
                    }}
                    style={{
                      flex: '0 0 auto', background: 'transparent', color: '#888',
                      border: '1px solid #2a2a2a', borderRadius: '10px',
                      padding: '14px 20px', fontSize: '14px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, background: saving ? '#8a6e2a' : '#c9a84c',
                      color: '#0a0a0a', border: 'none', borderRadius: '10px',
                      padding: '14px', fontSize: '15px', fontWeight: 800,
                      cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.3px',
                    }}
                  >
                    {saving ? 'Saving…' : 'Enter the Circle 🏆'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
