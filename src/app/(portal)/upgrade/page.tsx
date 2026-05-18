'use client';
import { useState } from 'react';
import { TIER_CONFIGS, MemberTier } from '@/types';

const TIERS: MemberTier[] = ['core', 'elite', 'founding'];

export default function UpgradePage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(tier: MemberTier) {
    const config = TIER_CONFIGS[tier];
    const priceId = billing === 'monthly' ? config.stripe_price_id_monthly : config.stripe_price_id_annual;
    if (!priceId) { alert('Stripe price IDs not configured. Add them to .env.local'); return; }

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

  return (
    <div style={{ padding: '48px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Upgrade Your Membership</h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>Unlock more channels, challenges, and exclusive access.</p>

        {/* Billing toggle */}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {TIERS.map(tier => {
          const config = TIER_CONFIGS[tier];
          const price = billing === 'monthly' ? config.price_monthly : Math.round(config.price_annual / 12);
          const totalAnnual = config.price_annual;
          const isElite = tier === 'elite';
          return (
            <div key={tier} style={{
              background: 'var(--black-card)', border: `2px solid ${isElite ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: '16px', padding: '28px', position: 'relative',
              boxShadow: isElite ? '0 0 30px rgba(201,168,76,0.2)' : 'none',
            }}>
              {isElite && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--gold)', color: '#0a0a0a', fontSize: '11px', fontWeight: 800,
                  padding: '3px 14px', borderRadius: '20px', letterSpacing: '0.5px',
                }}>MOST POPULAR</div>
              )}
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                {tier === 'core' ? '⚡' : tier === 'elite' ? '💎' : '👑'}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{config.label}</h2>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: config.color }}>${price}</span>
                <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/mo</span>
                {billing === 'annual' && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>${totalAnnual}/year billed annually</div>}
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '24px' }}>
                {config.features.map(f => (
                  <li key={f} style={{ fontSize: '13px', color: 'var(--muted)', display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: config.color }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => checkout(tier)} disabled={loading === tier}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  background: isElite ? 'var(--gold)' : 'var(--gold-dim)',
                  color: isElite ? '#0a0a0a' : 'var(--gold)',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                } as React.CSSProperties}>
                {loading === tier ? '…' : `Get ${config.label}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
