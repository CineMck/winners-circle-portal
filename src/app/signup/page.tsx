'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { TIER_CONFIGS, MemberTier, BASE_PROMO_PRICE } from '@/types';
import Logo from '@/components/Logo';

const TIERS: MemberTier[] = ['base', 'core', 'elite'];

// Current terms version. Bump when material changes are made — anyone who
// signed up under an older version will be re-prompted in the portal.
const CURRENT_TERMS_VERSION = '2026-06-04';

// Detailed feature descriptions shown on the signup tier cards
const TIER_FEATURE_DETAILS: Record<string, { title: string; desc: string }[]> = {
  base: [
    { title: '1 Zoom Call Per Month', desc: 'Join a live group call every month to stay connected and growing.' },
    { title: 'Free Resources Library', desc: 'Access curated tools, templates, and training materials.' },
    { title: 'Winners Circle App Access', desc: 'Take the Circle with you — resources and calls right in your pocket.' },
  ],
  core: [
    { title: '4 Zoom Lessons Per Month', desc: 'Live coaching lessons to keep your mindset and strategy sharp.' },
    { title: '1 Special Guest Call', desc: 'Hear from top performers across industries.' },
    { title: 'Unlimited Replay Access', desc: 'Watch on your schedule — never miss a breakthrough.' },
    { title: 'Community Access', desc: 'Connect and collaborate with fellow members in all community channels.' },
    { title: 'Challenges', desc: 'Compete in exclusive member challenges to level up and earn XP.' },
    { title: 'Premium Resources', desc: 'Full access to our growing library of premium tools and templates.' },
    { title: 'Courses', desc: 'On-demand video courses to sharpen your mindset and business skills.' },
    { title: 'Free Member-Only Events', desc: 'Get access to exclusive in-person experiences.' },
    { title: 'Winners Circle Swag', desc: 'Represent the mindset that wins.' },
  ],
  elite: [
    { title: 'Everything in Core', desc: 'Includes Zoom lessons, events, guest calls, swag, and replays.' },
    { title: 'Community Access', desc: 'Connect and collaborate with fellow members in all community channels.' },
    { title: 'Challenges', desc: 'Compete in exclusive member challenges to level up and earn XP.' },
    { title: 'Premium Resources', desc: 'Full access to our growing library of premium tools and templates.' },
    { title: 'Courses', desc: 'On-demand video courses to sharpen your mindset and business skills.' },
    { title: '2 Additional Live Group Calls / Month', desc: 'One Group Marketing Call and one Group Coaching Call — held the 2nd and 3rd Wednesdays of the month at Noon.' },
    { title: 'Group Marketing Call (1x/month)', desc: 'Deep dive into branding, lead gen, copywriting, and offers.' },
    { title: 'Group Coaching Call (1x/month)', desc: 'Live Q&A and hot seat coaching with John & elite peers.' },
  ],
};

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
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  // Account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Profile / questionnaire fields
  const [industry, setIndustry] = useState('');
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
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

  // Every purchasable plan requires payment now — the Free tier was retired
  // (existing free members are grandfathered) and replaced by Base.
  const requiresPayment = selectedTier !== 'free';

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!agreeTerms) {
      setError('Please review and agree to the Terms of Service & Privacy Policy.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Hardcoded so the link works no matter where the user signs up from
        // (web, iOS WebView, local dev). Was bouncing to localhost:8080 before.
        emailRedirectTo: 'https://winnerscircleportal.com/auth/callback',
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Save name + phone + SMS consent + terms acceptance immediately
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const username = fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        await supabase.from('profiles').update({
          full_name: fullName.trim(),
          username,
          phone: phone.trim() || null,
          sms_consent: smsConsent && !!phone.trim(),
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        }).eq('id', user.id);
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
        const { error: profileErr } = await supabase.from('profiles').update({
          industry: industry || null,
          phone: phone.trim() || null,
          sms_consent: smsConsent && !!phone.trim(),
          birthday: birthday || null,
          goals_12_months: goals12.trim() || null,
          goals_30_days: goals30.trim() || null,
        }).eq('id', user.id);
        if (profileErr) {
          console.error('Profile update error:', profileErr);
          setError(`Profile save failed: ${profileErr.message}`);
          setLoading(false);
          return;
        }
      }

      // Paid tier → Stripe Checkout. Webhook updates tier on payment success.
      if (requiresPayment) {
        const config = TIER_CONFIGS[selectedTier];
        // Base is monthly-only (promo price + free 30-day trial).
        const priceId = billing === 'monthly' || selectedTier === 'base'
          ? config.stripe_price_id_monthly
          : config.stripe_price_id_annual;
        if (!priceId) {
          setError(`Stripe ${billing} price not configured for ${config.label}. Ask an admin to set NEXT_PUBLIC_STRIPE_${selectedTier.toUpperCase()}_${billing.toUpperCase()}_PRICE_ID on Railway.`);
          setLoading(false);
          return;
        }

        let res: Response;
        try {
          res = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }),
          });
        } catch (netErr) {
          console.error('Checkout network error:', netErr);
          setError('Network error reaching checkout. Check your connection.');
          setLoading(false);
          return;
        }

        const text = await res.text();
        let data: { url?: string; error?: string } = {};
        try { data = JSON.parse(text); } catch {
          console.error('Checkout returned non-JSON:', text);
          setError(`Checkout failed (HTTP ${res.status}). Server response: ${text.slice(0, 200)}`);
          setLoading(false);
          return;
        }

        if (!res.ok || data.error) {
          console.error('Checkout API error:', data);
          setError(data.error || `Checkout failed (HTTP ${res.status})`);
          setLoading(false);
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError('Checkout returned no URL. Contact support.');
        setLoading(false);
        return;
      }

      // Free tier → straight to the portal.
      // Fire the Meta Pixel free-membership signup conversion.
      if (typeof window !== 'undefined') {
        (window as Window & { fbq?: (...args: unknown[]) => void }).fbq?.(
          'track',
          'CompleteRegistration',
          { content_name: 'Free Membership' }
        );
      }
      setStage('done');
      setTimeout(() => { window.location.href = '/home'; }, 1500);
    } catch (err) {
      console.error('handleProfile unexpected error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Something went wrong: ${msg}`);
      setLoading(false);
    }
  }

  const priceDisplay = (tier: MemberTier) => {
    const config = TIER_CONFIGS[tier];
    if (tier === 'free') return 'Free';
    if (billing === 'monthly' || tier === 'base') return `$${config.price_monthly}/mo`;
    return `$${Math.round(config.price_annual / 12)}/mo · $${config.price_annual}/yr`;
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--black-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: stage === 'tier' ? '1100px' : '460px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Logo size={72} ring style={{ margin: '0 auto 16px' }} />
          <h1 style={{
            fontSize: '22px', color: 'var(--gold)', marginBottom: '6px',
            fontFamily: 'var(--font-brand), Georgia, serif',
            fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Join The Winners Circle
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
            {/* Monthly/Annual toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', gap: 4, background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: 4 }}>
                {(['monthly', 'annual'] as const).map(b => (
                  <button key={b} type="button" onClick={() => setBilling(b)} style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: billing === b ? 'var(--gold)' : 'transparent',
                    color: billing === b ? '#0a0a0a' : '#888',
                    fontWeight: billing === b ? 700 : 400, fontSize: 14,
                    textTransform: 'capitalize',
                  }}>
                    {b} {b === 'annual' && <span style={{ fontSize: 11, background: '#22c55e', color: 'white', padding: '1px 6px', borderRadius: 10, marginLeft: 4 }}>Save 17%</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {TIERS.map(tier => {
                const config = TIER_CONFIGS[tier];
                const selected = selectedTier === tier;
                const isBestValue = tier === 'elite';
                const details = TIER_FEATURE_DETAILS[tier] || [];
                return (
                  <div key={tier} onClick={() => setSelectedTier(tier)} style={{
                    background: '#0f1520',
                    border: `2px solid ${selected ? config.color : isBestValue ? config.color + '66' : '#1e2a3a'}`,
                    borderRadius: '16px', padding: '28px', cursor: 'pointer',
                    transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
                    boxShadow: selected ? `0 0 28px ${config.color}44` : 'none',
                  }}>
                    {isBestValue && (
                      <div style={{
                        position: 'absolute', top: 0, right: 0,
                        background: '#f59e0b', color: '#000',
                        fontSize: '11px', fontWeight: 800, padding: '5px 14px',
                        borderBottomLeftRadius: '10px', letterSpacing: '0.5px',
                      }}>BEST VALUE</div>
                    )}

                    <div style={{ color: config.color, fontSize: '26px', marginBottom: '10px' }}>
                      {tier === 'base' ? '🌱' : tier === 'core' ? '⚡' : '🚀'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '20px', color: config.color, marginBottom: '2px' }}>
                      {config.label.toUpperCase()}{tier !== 'free' && ' MEMBERSHIP'}
                    </div>
                    {isBestValue && (
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                        Small Group Coaching — Limited To 10 People
                      </div>
                    )}
                    {tier === 'base' ? (
                      <div style={{ margin: '12px 0 20px' }}>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
                          <span style={{ color: '#666', textDecoration: 'line-through', fontSize: '17px', fontWeight: 600, marginRight: '8px' }}>
                            ${TIER_CONFIGS.base.price_monthly}
                          </span>
                          ${BASE_PROMO_PRICE}<span style={{ fontSize: '14px', color: '#888', fontWeight: 600 }}>/mo</span>
                        </div>
                        <div style={{
                          marginTop: '8px', display: 'inline-block',
                          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)',
                          color: '#22c55e', fontSize: '11.5px', fontWeight: 700,
                          padding: '4px 10px', borderRadius: '100px', letterSpacing: '0.5px',
                        }}>
                          FREE 30-DAY TRIAL
                        </div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                          Billing starts after your first month · Cancel anytime
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '12px 0 20px' }}>
                        {priceDisplay(tier)}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {details.map(f => (
                        <div key={f.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '6px',
                            background: '#1a4a2a', border: '2px solid #22c55e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, fontSize: '12px', marginTop: '1px',
                          }}>✓</div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: config.color, marginBottom: '2px' }}>{f.title}</div>
                            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>{f.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selected && (
                      <div style={{
                        marginTop: '20px', padding: '8px', borderRadius: '8px',
                        background: config.color + '22', border: `1px solid ${config.color}`,
                        textAlign: 'center', fontSize: '13px', fontWeight: 700, color: config.color,
                      }}>✓ Selected</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px' }}>
              <button onClick={() => setStage('account')} className="btn-gold" style={{ padding: '14px 42px', fontSize: '16px', fontWeight: 800 }}>
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
              {selectedTier === 'base' ? (
                <> · <strong style={{ color: '#22c55e' }}>Free 30-day trial</strong>, then ${BASE_PROMO_PRICE}/mo</>
              ) : requiresPayment && (
                <> · Billing: <strong style={{ color: '#c9a84c' }}>{billing === 'monthly' ? 'Monthly' : 'Annual'}</strong></>
              )}
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

              <div>
                <label style={labelStyle}>Phone Number <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000" style={inputStyle} />
              </div>

              {/* SMS opt-in — unchecked by default, only meaningful with a phone */}
              <label style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 10,
                padding: '12px 14px', cursor: 'pointer',
                opacity: phone.trim() ? 1 : 0.55,
              }}>
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={e => setSmsConsent(e.target.checked)}
                  disabled={!phone.trim()}
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: '#c9a84c', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>
                  Text me updates from The Winners Circle (call reminders, announcements).
                  Msg &amp; data rates may apply. Reply STOP anytime to opt out.{' '}
                  <Link href="/sms-policy" target="_blank" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
                    SMS Terms
                  </Link>
                </span>
              </label>

              {/* Terms agreement — must be checked */}
              <label style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: '#0e0e0e', border: '1px solid #2a2a2a', borderRadius: 10,
                padding: '12px 14px', cursor: 'pointer', marginTop: 4,
              }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => setAgreeTerms(e.target.checked)}
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: '#c9a84c', cursor: 'pointer' }}
                  required
                />
                <span style={{ fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>
                  I have read and agree to the{' '}
                  <Link href="/terms" target="_blank" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
                    Privacy Policy
                  </Link>
                  {requiresPayment && '. I understand my membership renews automatically and can be cancelled at any time.'}
                </span>
              </label>

              <button type="submit" disabled={loading || !agreeTerms} className="btn-gold"
                style={{
                  width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, marginTop: '8px',
                  opacity: agreeTerms ? 1 : 0.5, cursor: agreeTerms ? 'pointer' : 'not-allowed',
                }}>
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
              {requiresPayment
                ? 'Quick profile, then we\'ll take you to checkout.'
                : 'Help us personalise your experience in the Circle.'}
            </p>
            <form onSubmit={handleProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px' }}>
                  ⚠️ {error}
                </div>
              )}

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

              <div>
                <label style={labelStyle}>Birthday <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>

              <div>
                <label style={labelStyle}>What are your goals for the next 12 months?</label>
                <textarea value={goals12} onChange={e => setGoals12(e.target.value)}
                  placeholder="e.g. Close $5M in real estate deals, build a team of 10, launch a new product line…"
                  rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
              </div>

              <div>
                <label style={labelStyle}>What are your goals for the next 30 days?</label>
                <textarea value={goals30} onChange={e => setGoals30(e.target.value)}
                  placeholder="e.g. Close 2 deals, complete the 75 Hard challenge, finish the sales course…"
                  rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }} />
              </div>

              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, marginTop: 8 }}>
                {loading
                  ? (requiresPayment ? 'Redirecting to checkout…' : 'Saving…')
                  : (requiresPayment ? `Continue to Payment →` : 'Enter the Circle 🏆')}
              </button>
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
