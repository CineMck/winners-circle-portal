'use client';
import { useEffect, useState } from 'react';
import { TIER_CONFIGS, MemberTier, TIER_ORDER } from '@/types';
import { createClient } from '@/lib/supabase/client';

const TIERS: MemberTier[] = ['free', 'core', 'elite', 'founding'];

export default function UpgradePage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<MemberTier | null>(null);
  const [eliteRequest, setEliteRequest] = useState<{ state: 'idle' | 'sending' | 'sent' | 'error'; message?: string }>({ state: 'idle' });

  const supabase = createClient();

  // Fetch current member tier so we can highlight "Current Plan"
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();
      if (profile?.tier) setCurrentTier(profile.tier as MemberTier);
    })();
  }, [supabase]);

  async function checkout(tier: MemberTier) {
    const config = TIER_CONFIGS[tier];
    const priceId = billing === 'monthly' ? config.stripe_price_id_monthly : config.stripe_price_id_annual;
    if (!priceId) { alert('Stripe price IDs not configured.'); return; }
    setLoading(tier);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setLoading(null);
  }

  async function requestEliteAccess() {
    setEliteRequest({ state: 'sending' });
    try {
      const res = await fetch('/api/elite-request', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setEliteRequest({ state: 'error', message: json.error || 'Failed to send request' });
        return;
      }
      setEliteRequest({ state: 'sent', message: json.message || 'Request sent — Christian will be in touch.' });
    } catch {
      setEliteRequest({ state: 'error', message: 'Network error — please try again.' });
    }
  }

  return (
    <div style={{ padding: '32px 16px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Membership Plans</h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Unlock more channels, challenges, and direct access as you grow with the community.
        </p>

        {currentTier && (
          <div style={{ marginTop: '14px', fontSize: '13px', color: 'var(--muted)' }}>
            You&apos;re currently on the{' '}
            <span style={{ color: TIER_CONFIGS[currentTier].color, fontWeight: 700 }}>
              {TIER_CONFIGS[currentTier].label}
            </span>{' '}
            plan.
          </div>
        )}

        <div style={{ display: 'inline-flex', gap: '4px', background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px', marginTop: '20px' }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)} style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: billing === b ? 'var(--gold)' : 'transparent',
              color: billing === b ? '#0a0a0a' : 'var(--muted)',
              fontWeight: billing === b ? 700 : 400, fontSize: '14px',
              textTransform: 'capitalize',
            }}>
              {b} {b === 'annual' && <span style={{ fontSize: '11px', background: '#22c55e', color: 'white', padding: '1px 6px', borderRadius: '10px', marginLeft: '4px' }}>Save 17%</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '16px' }}>
        {TIERS.map(tier => {
          const config = TIER_CONFIGS[tier];
          const price = billing === 'monthly' ? config.price_monthly : Math.round(config.price_annual / 12);
          const totalAnnual = config.price_annual;
          const isElite = tier === 'elite';
          const isOneOnOne = tier === 'founding'; // now labelled "1-1 Elite Member"
          const isFree = tier === 'free';
          const isCurrent = currentTier === tier;
          const userIdx = currentTier ? TIER_ORDER.indexOf(currentTier) : -1;
          const tierIdx = TIER_ORDER.indexOf(tier);
          const isDowngrade = userIdx >= 0 && tierIdx < userIdx;

          return (
            <div key={tier} style={{
              background: 'var(--black-card)',
              border: `2px solid ${isCurrent ? '#22c55e' : isElite ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: '16px', padding: '24px', position: 'relative',
              boxShadow: isElite && !isCurrent ? '0 0 30px rgba(201,168,76,0.2)' : 'none',
              opacity: isDowngrade ? 0.6 : 1,
            }}>
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: '#22c55e', color: '#0a0a0a', fontSize: '11px', fontWeight: 800,
                  padding: '3px 14px', borderRadius: '20px', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                }}>CURRENT PLAN</div>
              )}
              {isElite && !isCurrent && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--gold)', color: '#0a0a0a', fontSize: '11px', fontWeight: 800,
                  padding: '3px 14px', borderRadius: '20px', letterSpacing: '0.5px',
                }}>MOST POPULAR</div>
              )}

              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {isFree ? '🌱' : tier === 'core' ? '⚡' : tier === 'elite' ? '💎' : '👑'}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{config.label}</h2>

              <div style={{ marginBottom: '18px', minHeight: 56 }}>
                {isOneOnOne ? (
                  <>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: config.color }}>By application</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 4 }}>Limited seats — pricing on request.</div>
                  </>
                ) : isFree ? (
                  <>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: config.color }}>Free</span>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: 4 }}>No credit card required.</div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: config.color }}>${price}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mo</span>
                    {billing === 'annual' && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>${totalAnnual}/year billed annually</div>
                    )}
                  </>
                )}
              </div>

              <ul style={{ listStyle: 'none', marginBottom: '20px', padding: 0 }}>
                {config.features.map(f => (
                  <li key={f} style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: config.color, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <button disabled style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #22c55e',
                  background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                  fontWeight: 700, fontSize: '14px', cursor: 'default',
                }}>
                  ✓ Your Plan
                </button>
              ) : isFree ? (
                <button disabled style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--muted)',
                  fontWeight: 700, fontSize: '14px', cursor: 'default',
                }}>
                  Default for new members
                </button>
              ) : isOneOnOne ? (
                <button
                  onClick={requestEliteAccess}
                  disabled={eliteRequest.state === 'sending' || eliteRequest.state === 'sent'}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                    background: eliteRequest.state === 'sent' ? '#22c55e' : config.color,
                    color: '#0a0a0a', fontWeight: 700, fontSize: '14px',
                    cursor: eliteRequest.state === 'sending' ? 'wait' : 'pointer',
                  }}
                >
                  {eliteRequest.state === 'sending' ? 'Sending…'
                    : eliteRequest.state === 'sent' ? '✓ Request Sent'
                    : 'Request Access'}
                </button>
              ) : isDowngrade ? (
                <button disabled style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--muted)',
                  fontWeight: 700, fontSize: '14px', cursor: 'not-allowed',
                }}>
                  Contact support to downgrade
                </button>
              ) : (
                <button onClick={() => checkout(tier)} disabled={loading === tier}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                    background: isElite ? 'var(--gold)' : 'var(--gold-dim)',
                    color: isElite ? '#0a0a0a' : 'var(--gold)',
                    fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  }}>
                  {loading === tier ? '…' : userIdx >= 0 ? `Upgrade to ${config.label}` : `Get ${config.label}`}
                </button>
              )}

              {/* Inline status for elite request */}
              {isOneOnOne && eliteRequest.message && (
                <div style={{
                  marginTop: 10, fontSize: 12,
                  color: eliteRequest.state === 'error' ? '#ef4444' : '#22c55e',
                }}>
                  {eliteRequest.state === 'error' ? '⚠️ ' : '✓ '}{eliteRequest.message}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
