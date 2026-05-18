'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { TIER_CONFIGS, MemberTier } from '@/types';

const TIERS: MemberTier[] = ['core', 'elite', 'founding'];

export default function SignupPage() {
  const [step, setStep] = useState<'tier' | 'account'>('tier');
  const [selectedTier, setSelectedTier] = useState<MemberTier>('core');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) { setError(error.message); setLoading(false); }
    else {
      // Redirect to payment after email confirmation
      // For now, redirect to home — Stripe checkout will be triggered from profile
      window.location.href = '/home';
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--black-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: step === 'tier' ? '800px' : '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--gold-dim)', border: '2px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '28px',
          }}>🏆</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Join the Winner&apos;s Circle</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>
            {step === 'tier' ? 'Choose your membership level' : 'Create your account'}
          </p>
        </div>

        {step === 'tier' ? (
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
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        ) : (
          <div className="card" style={{ padding: '32px' }}>
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', padding: '12px', color: '#ef4444', fontSize: '13px',
                }}>{error}</div>
              )}
              {(['Full Name', 'Email', 'Password'] as const).map((label) => (
                <div key={label}>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>
                    {label}
                  </label>
                  <input
                    type={label === 'Password' ? 'password' : label === 'Email' ? 'email' : 'text'}
                    value={label === 'Full Name' ? fullName : label === 'Email' ? email : password}
                    onChange={e => label === 'Full Name' ? setFullName(e.target.value) : label === 'Email' ? setEmail(e.target.value) : setPassword(e.target.value)}
                    required
                    placeholder={label === 'Full Name' ? 'John Smith' : label === 'Email' ? 'you@example.com' : '••••••••'}
                    style={{
                      width: '100%', background: '#161616',
                      border: '1px solid var(--border)', borderRadius: '8px',
                      padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
                    }}
                  />
                </div>
              ))}
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
          {step === 'tier' ? (
            <button onClick={() => setStep('account')} className="btn-gold" style={{ padding: '12px 32px' }}>
              Continue with {TIER_CONFIGS[selectedTier].label} →
            </button>
          ) : (
            <button onClick={() => setStep('tier')} className="btn-outline" style={{ padding: '12px 24px' }}>
              ← Back
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--muted)', fontSize: '14px' }}>
          Already a member?{' '}
          <Link href="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
