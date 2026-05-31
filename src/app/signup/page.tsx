'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { TIER_CONFIGS, MemberTier } from '@/types';

const TIERS: MemberTier[] = ['core', 'elite', 'founding'];

const INDUSTRIES = [
  'Real Estate', 'Finance & Investing', 'Entrepreneurship / Business',
  'Technology', 'Healthcare', 'Legal', 'Marketing & Advertising',
  'Consulting', 'E-Commerce & Retail', 'Construction & Trades',
  'Education & Coaching', 'Insurance', 'Manufacturing', 'Non-Profit', 'Other',
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

type Stage = 'tier' | 'account' | 'profile' | 'done';

export default function SignupPage() {
  const [stage, setStage] = useState<Stage>('tier');
  const [selectedTier, setSelectedTier] = useState<MemberTier>('core');

  // Account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Profile / questionnaire fields
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [goals12, setGoals12] = useState('');
  const [goals30, setGoals30] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  // Step indicator helper
  const steps = [
    { id: 'tier', label: 'Plan' },
    { id: 'account', label: 'Account' },
    { id: 'profile', label: 'Profile' },
  ];
  const currentStepIdx = steps.findIndex(s => s.id === stage);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Save name to profile immediately
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        await supabase.from('profiles').update({ full_name: fullName.trim(), username }).eq('id', user.id);
      }
      setLoading(false);
      setStage('profile');
    }
  }

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!industry) { setError('Please select your industry.'); return; }
    setLoading(true);
    setError('');
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
      setTimeout(() => { window.location.href = '/home'; }, 1500);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--black-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: stage === 'tier' ? '800px' : '460px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--gold-dim)', border: '2px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '28px',
          }}>🏆</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>
            Join the Winner&apos;s Circle
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            {stage === 'tier' && 'Choose your membership level'}
            {stage === 'account' && 'Create your account'}
            {stage === 'profile' && 'Tell us about yourself'}
            {stage === 'done' && 'Welcome to the Circle!'}
          </p>
        </div>

        {/* Progress indicator — shown on account + profile steps */}
        {(stage === 'account' || stage === 'profile') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px' }}>
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isActive = idx === currentStepIdx;
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: idx < steps.length - 1 ? '1' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: isCompleted ? '#2a5a1a' : isActive ? '#c9a84c' : '#2a2a2a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700,
                      color: isCompleted ? '#22c55e' : isActive ? '#0a0a0a' : '#888',
                    }}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: isActive ? '#c9a84c' : isCompleted ? '#555' : '#555',
                    }}>{step.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div style={{ flex: 1, height: '1px', background: isCompleted ? '#c9a84c' : '#2a2a2a' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Step 1: Tier Selection ── */}
        {stage === 'tier' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {TIERS.map(tier => {
                const config = TIER_CONFIGS[tier];
                const selected = selectedTier === tier;
                return (
                  <div key={tier} onClick={() => setSelectedTier(tier)} style={{
                    background: 'var(--black-card)',
                    border: `2px solid ${selected ? config.color : 'var(--border)'}`,
                    borderRadius: '16px', padding: '24px', cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: selected ? `0 0 20px ${config.color}33` : 'none',
                  }}>
                    <div style={{ color: config.color, fontSize: '28px', marginBottom: '8px' }}>
                      {tier === 'core' ? '⚡' : tier === 'elite' ? '💎' : '👑'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '4px' }}>{config.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: config.color, marginBottom: '16px' }}>
                      ${config.price_monthly}<span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>/mo</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {config.features.map(f => (
                        <li key={f} style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '8px' }}>
                          <span style={{ color: config.color }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <button onClick={() => setStage('account')} className="btn-gold" style={{ padding: '13px 36px', fontSize: '15px' }}>
                Continue with {TIER_CONFIGS[selectedTier].label} →
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Account Creation ── */}
        {stage === 'account' && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderTop: '3px solid #c9a84c', borderRadius: '16px', padding: '36px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>Create your account</h2>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#888' }}>
              Your <strong style={{ color: '#c9a84c' }}>{TIER_CONFIGS[selectedTier].label}</strong> membership starts here.
            </p>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px' }}>
                  ⚠️ {error}
                </div>
              )}
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="John Smith" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" minLength={8} required style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, marginTop: '8px' }}>
                {loading ? 'Creating account…' : 'Continue →'}
              </button>
            </form>
            <button onClick={() => setStage('tier')} style={{
              marginTop: '16px', background: 'none', border: 'none',
              color: '#555', cursor: 'pointer', fontSize: '13px', width: '100%',
            }}>← Back to plan selection</button>
          </div>
        )}

        {/* ── Step 3: Profile Questionnaire ── */}
        {stage === 'profile' && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderTop: '3px solid #c9a84c', borderRadius: '16px', padding: '36px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#fff' }}>Tell us about yourself</h2>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#888' }}>
              Help us personalise your experience in the Circle.
            </p>
            <form onSubmit={handleProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px' }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Industry */}
              <div>
                <label style={labelStyle}>What industry are you in? <span style={{ color: '#ef4444' }}>*</span></label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} required style={{
                  ...inputStyle, appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                  paddingRight: '36px', cursor: 'pointer',
                }}>
                  <option value="">Select your industry…</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone Number <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000" style={inputStyle} />
              </div>

              {/* Birthday */}
              <div>
                <label style={labelStyle}>Birthday <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>

              {/* 12-month goals */}
              <div>
                <label style={labelStyle}>What are your goals for the next 12 months?</label>
                <textarea value={goals12} onChange={e => setGoals12(e.target.value)}
                  placeholder="e.g. Close $5M in real estate deals, build a team of 10, launch a new product line…"
                  rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
              </div>

              {/* 30-day goals */}
              <div>
                <label style={labelStyle}>What are your goals for the next 30 days?</label>
                <textarea value={goals30} onChange={e => setGoals30(e.target.value)}
                  placeholder="e.g. Close 2 deals, complete the 75 Hard challenge, finish the sales course…"
                  rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => { window.location.href = '/home'; }}
                  style={{ flex: '0 0 auto', background: 'transparent', color: '#888', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Skip
                </button>
                <button type="submit" disabled={loading} className="btn-gold"
                  style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 800 }}>
                  {loading ? 'Saving…' : 'Enter the Circle 🏆'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Done ── */}
        {stage === 'done' && (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderTop: '3px solid #c9a84c', borderRadius: '16px', padding: '48px 36px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ color: '#c9a84c', marginBottom: '8px', fontSize: '22px', fontWeight: 800 }}>Welcome to the Circle!</h2>
            <p style={{ color: '#888', fontSize: '14px' }}>Taking you to your dashboard…</p>
          </div>
        )}

        {stage !== 'done' && (
          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: '14px' }}>
            Already a member?{' '}
            <Link href="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
