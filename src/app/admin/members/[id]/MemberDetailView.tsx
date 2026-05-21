'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTierColor, getTierLabel, type MemberTier, type UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  id: string; email: string; full_name: string; username: string;
  avatar_url: string | null; bio: string | null;
  tier: MemberTier; role: UserRole;
  xp_points: number; stripe_customer_id: string | null;
  stripe_subscription_id: string | null; subscription_status: string | null;
  is_comped: boolean | null;
  industry: string | null; birthday: string | null; phone: string | null;
  goals_12_months: string | null; goals_30_days: string | null;
  address_line1: string | null; address_city: string | null;
  address_state: string | null; address_zip: string | null; address_country: string | null;
  referral_code: string | null;
  created_at: string;
}

interface Referral {
  id: string; referred_email: string; status: string; created_at: string;
  referred_user?: { full_name: string; email: string; tier: string; avatar_url: string | null } | null;
}

interface BillingData {
  hasStripe: boolean;
  is_comped: boolean;
  customer: { id: string; balance: number; currency: string } | null;
  subscription: {
    id: string; status: string; cancelAtPeriodEnd: boolean;
    currentPeriodStart: number; currentPeriodEnd: number;
    trialEnd: number | null; cancelAt: number | null;
    items: { priceId: string; amount: number | null; currency: string; interval: string }[];
  } | null;
  invoices: {
    id: string; number: string | null; status: string | null;
    amountDue: number; amountPaid: number; currency: string;
    created: number; hostedUrl: string | null; pdfUrl: string | null;
    description: string | null; chargeId: string | null;
  }[];
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
}

interface Props {
  profile: Profile;
  lastLogin: string | null;
  referrals: Referral[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
function fmtDate(ts: number) { return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtDateStr(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SUB_STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', trialing: '#60a5fa', past_due: '#f59e0b',
  canceled: '#ef4444', cancel_at_period_end: '#f59e0b', comped: '#a78bfa', unpaid: '#ef4444',
};
const SUB_STATUS_LABELS: Record<string, string> = {
  active: '✅ Active', trialing: '🔵 Trialing', past_due: '⚠️ Past Due',
  canceled: '❌ Canceled', cancel_at_period_end: '⏳ Cancels at period end',
  comped: '🎁 Comped (Free)', unpaid: '🔴 Unpaid',
};

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{children}</div>;
}
function Value({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '14px', color: 'var(--text)' }}>{children}</div>;
}
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <Label>{label}</Label>
      <Value>{value || <span style={{ color: '#444', fontStyle: 'italic' }}>Not provided</span>}</Value>
    </div>
  );
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', ...style }}>
      {children}
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────
function ProfileTab({ profile, lastLogin, onUpdate }: { profile: Profile; lastLogin: string | null; onUpdate: (p: Partial<Profile>) => void }) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [tier, setTier] = useState(profile.tier);
  const [role, setRole] = useState(profile.role);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState('');

  async function save() {
    setSaving(true);
    await supabase.from('profiles').update({ tier, role }).eq('id', profile.id);
    onUpdate({ tier, role });
    setEditing(false);
    setSaving(false);
    setResult('✅ Saved');
    setTimeout(() => setResult(''), 3000);
  }

  const tc = getTierColor(profile.tier);
  const inp: React.CSSProperties = { background: '#161616', border: '1px solid #333', borderRadius: '7px', padding: '7px 10px', color: '#fff', fontSize: '13px', outline: 'none' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

      {/* Contact Info */}
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phone} />
          <Field label="Birthday" value={profile.birthday ? fmtDateStr(profile.birthday) : null} />
          <Field label="Industry" value={profile.industry} />
          <div>
            <Label>Address</Label>
            {profile.address_line1 ? (
              <Value>
                {profile.address_line1}<br />
                {[profile.address_city, profile.address_state, profile.address_zip].filter(Boolean).join(', ')}
                {profile.address_country ? ` · ${profile.address_country}` : ''}
              </Value>
            ) : <Value><span style={{ color: '#444', fontStyle: 'italic' }}>Not provided</span></Value>}
          </div>
          <div>
            <Label>Member Since</Label>
            <Value>{fmtDateStr(profile.created_at)}</Value>
          </div>
          <div>
            <Label>Last Login</Label>
            <Value>{lastLogin ? fmtDateStr(lastLogin) : '—'}</Value>
          </div>
        </div>
      </Card>

      {/* Goals */}
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goals & Bio</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="Bio" value={profile.bio} />
          <div>
            <Label>12-Month Goals</Label>
            <div style={{ fontSize: '13px', color: profile.goals_12_months ? 'var(--text)' : '#444', lineHeight: 1.6, fontStyle: profile.goals_12_months ? 'normal' : 'italic' }}>
              {profile.goals_12_months || 'Not provided'}
            </div>
          </div>
          <div>
            <Label>30-Day Goals</Label>
            <div style={{ fontSize: '13px', color: profile.goals_30_days ? 'var(--text)' : '#444', lineHeight: 1.6, fontStyle: profile.goals_30_days ? 'normal' : 'italic' }}>
              {profile.goals_30_days || 'Not provided'}
            </div>
          </div>
          <div>
            <Label>XP Points</Label>
            <Value><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{profile.xp_points.toLocaleString()} XP</span></Value>
          </div>
          {profile.referral_code && (
            <div>
              <Label>Referral Code</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '4px 10px', fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>{profile.referral_code}</code>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Account Settings */}
      <Card style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Settings</h3>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '7px', padding: '6px 14px', cursor: 'pointer', color: '#ccc', fontSize: '12px', fontWeight: 600 }}>
              ✏️ Edit
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <Label>Tier</Label>
            {editing ? (
              <select value={tier} onChange={e => setTier(e.target.value as MemberTier)} style={inp}>
                {['free', 'core', 'elite', 'founding'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 700, color: tc, border: `1px solid ${tc}`, padding: '3px 10px', borderRadius: '20px' }}>
                {getTierLabel(profile.tier)}
              </span>
            )}
          </div>
          <div>
            <Label>Role</Label>
            {editing ? (
              <select value={role} onChange={e => setRole(e.target.value as UserRole)} style={inp}>
                {['member', 'moderator', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: '13px', color: role === 'admin' ? '#ef4444' : role === 'moderator' ? 'var(--gold)' : '#888' }}>
                {role}
              </span>
            )}
          </div>
          <div>
            <Label>Comped</Label>
            <span style={{ fontSize: '13px', color: profile.is_comped ? '#a78bfa' : '#444' }}>
              {profile.is_comped ? '🎁 Yes — free access' : 'No'}
            </span>
          </div>
          <div>
            <Label>Username</Label>
            <Value>@{profile.username}</Value>
          </div>
          {editing && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button onClick={() => setEditing(false)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '7px', padding: '7px 14px', cursor: 'pointer', color: '#888', fontSize: '12px', fontWeight: 600 }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ background: 'var(--gold)', border: 'none', borderRadius: '7px', padding: '7px 16px', cursor: 'pointer', color: '#0a0a0a', fontSize: '12px', fontWeight: 800 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
        {result && <div style={{ marginTop: '10px', fontSize: '13px', color: '#22c55e' }}>{result}</div>}
      </Card>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ profile }: { profile: Profile }) {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Charge modal
  const [showCharge, setShowCharge] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeSendEmail, setChargeSendEmail] = useState(true);

  // Refund modal
  const [showRefund, setShowRefund] = useState(false);
  const [refundChargeId, setRefundChargeId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');

  // Comp modal
  const [showComp, setShowComp] = useState(false);
  const [compTier, setCompTier] = useState<MemberTier>('founding');
  const [compCancelSub, setCompCancelSub] = useState(false);

  useEffect(() => { fetchBilling(); }, []);

  async function fetchBilling() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/${profile.id}`);
      if (res.ok) setBilling(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  function showResult(type: 'success' | 'error', msg: string) {
    setResult({ type, msg });
    setTimeout(() => setResult(null), 6000);
  }

  async function handleSubscriptionAction(action: string) {
    if (!confirm(`Are you sure you want to: ${action.replace(/_/g, ' ')}?`)) return;
    setActionLoading(action);
    try {
      const res = await fetch('/api/admin/billing/subscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showResult('success', `✅ Done: ${action.replace(/_/g, ' ')}`);
      await fetchBilling();
    } catch (e) { showResult('error', String(e)); }
    setActionLoading('');
  }

  async function handleCharge() {
    const cents = Math.round(parseFloat(chargeAmount) * 100);
    if (!cents || cents < 50) { showResult('error', 'Enter a valid amount ($0.50 min)'); return; }
    setActionLoading('charge');
    try {
      const res = await fetch('/api/admin/billing/charge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, amountCents: cents, description: chargeDesc, sendEmail: chargeSendEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showResult('success', `✅ Invoice created! ${data.hostedUrl ? `View: ${data.hostedUrl}` : ''}`);
      setShowCharge(false); setChargeAmount(''); setChargeDesc('');
      await fetchBilling();
    } catch (e) { showResult('error', String(e)); }
    setActionLoading('');
  }

  async function handleRefund() {
    if (!refundChargeId) { showResult('error', 'Select a charge to refund'); return; }
    const cents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
    setActionLoading('refund');
    try {
      const res = await fetch('/api/admin/billing/refund', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chargeId: refundChargeId, amountCents: cents, reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showResult('success', `✅ Refund issued: ${fmt(data.amount, data.currency)}`);
      setShowRefund(false); setRefundAmount(''); setRefundChargeId('');
      await fetchBilling();
    } catch (e) { showResult('error', String(e)); }
    setActionLoading('');
  }

  async function handleComp() {
    setActionLoading('comp');
    try {
      const res = await fetch('/api/admin/billing/comp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, tier: compTier, cancelStripeSubscription: compCancelSub }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showResult('success', `✅ Member comped as ${compTier}${compCancelSub ? ' (Stripe subscription canceled)' : ''}`);
      setShowComp(false);
      await fetchBilling();
    } catch (e) { showResult('error', String(e)); }
    setActionLoading('');
  }

  const inp: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 12px', color: '#fff', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' };

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center' }}>Loading billing data…</div>;

  const sub = billing?.subscription;
  const subStatus = sub?.status || profile.subscription_status || 'none';
  const statusColor = SUB_STATUS_COLORS[subStatus] || '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Result banner */}
      {result && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: result.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.type === 'success' ? '#22c55e44' : '#ef444444'}`, fontSize: '13px', color: result.type === 'success' ? '#22c55e' : '#ef4444' }}>
          {result.msg}
        </div>
      )}

      {/* Subscription status */}
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subscription</h3>
        {!billing?.hasStripe ? (
          <div style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>No Stripe account linked to this member.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <Label>Status</Label>
                <span style={{ fontSize: '14px', fontWeight: 700, color: statusColor }}>
                  {SUB_STATUS_LABELS[subStatus] || subStatus}
                </span>
                {billing.is_comped && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#a78bfa', background: '#a78bfa18', padding: '2px 8px', borderRadius: '10px' }}>🎁 Comped</span>}
              </div>
              {sub && (
                <>
                  <div>
                    <Label>Plan</Label>
                    <Value>
                      {sub.items[0] ? `${fmt(sub.items[0].amount || 0)} / ${sub.items[0].interval}` : '—'}
                    </Value>
                  </div>
                  <div>
                    <Label>Current Period</Label>
                    <Value>{fmtDate(sub.currentPeriodStart)} → {fmtDate(sub.currentPeriodEnd)}</Value>
                  </div>
                  {sub.cancelAtPeriodEnd && (
                    <div>
                      <Label>Cancels</Label>
                      <Value><span style={{ color: '#f59e0b' }}>🕐 {sub.cancelAt ? fmtDate(sub.cancelAt) : fmtDate(sub.currentPeriodEnd)}</span></Value>
                    </div>
                  )}
                </>
              )}
              {billing.paymentMethod && (
                <div>
                  <Label>Card on File</Label>
                  <Value>{billing.paymentMethod.brand?.toUpperCase()} ···· {billing.paymentMethod.last4} — exp {billing.paymentMethod.expMonth}/{billing.paymentMethod.expYear}</Value>
                </div>
              )}
              {billing.customer && billing.customer.balance !== 0 && (
                <div>
                  <Label>Account Balance</Label>
                  <Value><span style={{ color: billing.customer.balance < 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                    {billing.customer.balance < 0 ? `${fmt(Math.abs(billing.customer.balance), billing.customer.currency)} credit` : `${fmt(billing.customer.balance, billing.customer.currency)} owed`}
                  </span></Value>
                </div>
              )}
            </div>

            {/* Subscription actions */}
            {sub && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid #222' }}>
                {sub.status === 'past_due' && (
                  <button onClick={() => handleSubscriptionAction('retry_payment')} disabled={!!actionLoading}
                    style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: '7px', padding: '7px 14px', cursor: 'pointer', color: '#22c55e', fontSize: '12px', fontWeight: 700 }}>
                    {actionLoading === 'retry_payment' ? 'Retrying…' : '🔄 Retry Payment'}
                  </button>
                )}
                {sub.cancelAtPeriodEnd ? (
                  <button onClick={() => handleSubscriptionAction('uncancel')} disabled={!!actionLoading}
                    style={{ background: '#60a5fa22', border: '1px solid #60a5fa44', borderRadius: '7px', padding: '7px 14px', cursor: 'pointer', color: '#60a5fa', fontSize: '12px', fontWeight: 700 }}>
                    {actionLoading === 'uncancel' ? '…' : '↩ Undo Cancellation'}
                  </button>
                ) : (
                  <button onClick={() => handleSubscriptionAction('cancel_period_end')} disabled={!!actionLoading}
                    style={{ background: '#f59e0b22', border: '1px solid #f59e0b44', borderRadius: '7px', padding: '7px 14px', cursor: 'pointer', color: '#f59e0b', fontSize: '12px', fontWeight: 700 }}>
                    {actionLoading === 'cancel_period_end' ? '…' : '⏳ Cancel at Period End'}
                  </button>
                )}
                <button onClick={() => handleSubscriptionAction('cancel_immediately')} disabled={!!actionLoading}
                  style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: '7px', padding: '7px 14px', cursor: 'pointer', color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>
                  {actionLoading === 'cancel_immediately' ? '…' : '🗑 Cancel Immediately'}
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Quick billing actions */}
      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowCharge(true)}
            style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: 800 }}>
            💳 Create Invoice
          </button>
          <button onClick={() => setShowRefund(true)}
            style={{ background: '#60a5fa22', border: '1px solid #60a5fa44', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', color: '#60a5fa', fontSize: '13px', fontWeight: 700 }}>
            ↩ Issue Refund
          </button>
          <button onClick={() => setShowComp(true)}
            style={{ background: '#a78bfa22', border: '1px solid #a78bfa44', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', color: '#a78bfa', fontSize: '13px', fontWeight: 700 }}>
            🎁 Comp Membership
          </button>
          {billing?.customer?.id && (
            <a href={`https://dashboard.stripe.com/customers/${billing.customer.id}`} target="_blank" rel="noreferrer"
              style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', color: '#888', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              🔗 View in Stripe ↗
            </a>
          )}
        </div>
      </Card>

      {/* Invoice history */}
      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice History</h3>
        {!billing?.invoices?.length ? (
          <div style={{ color: '#444', fontSize: '13px', fontStyle: 'italic' }}>No invoices found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {billing.invoices.map(inv => {
              const isPaid = inv.status === 'paid';
              const statusC = isPaid ? '#22c55e' : inv.status === 'open' ? '#f59e0b' : '#ef4444';
              return (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#0d0d0d', borderRadius: '8px', border: '1px solid #1e1e1e' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {inv.description || (inv.number ? `Invoice #${inv.number}` : 'Invoice')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{fmtDate(inv.created)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: isPaid ? '#22c55e' : 'var(--text)' }}>
                      {fmt(isPaid ? inv.amountPaid : inv.amountDue, inv.currency)}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: statusC, background: `${statusC}18`, padding: '1px 7px', borderRadius: '8px', textTransform: 'uppercase' }}>
                      {inv.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {inv.hostedUrl && (
                      <a href={inv.hostedUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: '11px', color: '#60a5fa', background: '#60a5fa18', border: '1px solid #60a5fa33', borderRadius: '6px', padding: '4px 8px', textDecoration: 'none', fontWeight: 600 }}>
                        View
                      </a>
                    )}
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: '11px', color: '#888', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '4px 8px', textDecoration: 'none', fontWeight: 600 }}>
                        PDF
                      </a>
                    )}
                    {inv.chargeId && isPaid && (
                      <button onClick={() => { setRefundChargeId(inv.chargeId!); setShowRefund(true); }}
                        style={{ fontSize: '11px', color: '#f59e0b', background: '#f59e0b18', border: '1px solid #f59e0b33', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontWeight: 600 }}>
                        Refund
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Create Invoice Modal ── */}
      {showCharge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCharge(false)}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', width: '400px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 800 }}>💳 Create Invoice</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label>Amount (USD)</Label>
                <input type="number" min="0.50" step="0.01" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)}
                  placeholder="97.00" style={inp} autoFocus />
              </div>
              <div>
                <Label>Description</Label>
                <input value={chargeDesc} onChange={e => setChargeDesc(e.target.value)}
                  placeholder="Monthly membership dues" style={inp} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#ccc' }}>
                <input type="checkbox" checked={chargeSendEmail} onChange={e => setChargeSendEmail(e.target.checked)} style={{ accentColor: '#c9a84c' }} />
                Send invoice by email (gives 7 days to pay)
              </label>
              {!chargeSendEmail && <div style={{ fontSize: '12px', color: '#888', background: '#1a1a1a', padding: '8px 12px', borderRadius: '6px' }}>⚡ Will attempt to charge card on file immediately.</div>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button onClick={() => setShowCharge(false)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', color: '#888', fontSize: '13px' }}>Cancel</button>
                <button onClick={handleCharge} disabled={actionLoading === 'charge'}
                  style={{ background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '9px 20px', cursor: 'pointer', color: '#0a0a0a', fontSize: '13px', fontWeight: 800 }}>
                  {actionLoading === 'charge' ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Modal ── */}
      {showRefund && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowRefund(false)}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', width: '400px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 800 }}>↩ Issue Refund</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label>Charge to Refund</Label>
                <select value={refundChargeId} onChange={e => setRefundChargeId(e.target.value)} style={inp}>
                  <option value="">— Select a paid invoice —</option>
                  {billing?.invoices.filter(i => i.chargeId && i.status === 'paid').map(i => (
                    <option key={i.id} value={i.chargeId!}>
                      {i.description || `Invoice #${i.number}`} — {fmt(i.amountPaid, i.currency)} ({fmtDate(i.created)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Refund Amount (leave blank for full refund)</Label>
                <input type="number" min="0" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                  placeholder="Full refund" style={inp} />
              </div>
              <div>
                <Label>Reason</Label>
                <select value={refundReason} onChange={e => setRefundReason(e.target.value)} style={inp}>
                  <option value="requested_by_customer">Requested by customer</option>
                  <option value="duplicate">Duplicate charge</option>
                  <option value="fraudulent">Fraudulent charge</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button onClick={() => setShowRefund(false)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', color: '#888', fontSize: '13px' }}>Cancel</button>
                <button onClick={handleRefund} disabled={actionLoading === 'refund' || !refundChargeId}
                  style={{ background: '#60a5fa', border: 'none', borderRadius: '8px', padding: '9px 20px', cursor: 'pointer', color: '#0a0a0a', fontSize: '13px', fontWeight: 800 }}>
                  {actionLoading === 'refund' ? 'Issuing…' : 'Issue Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Comp Modal ── */}
      {showComp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowComp(false)}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', width: '420px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>🎁 Comp Membership</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#888' }}>Give this member free access at any tier. Their Stripe subscription can optionally be canceled.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label>Comp Tier</Label>
                <select value={compTier} onChange={e => setCompTier(e.target.value as MemberTier)} style={inp}>
                  <option value="core">Core</option>
                  <option value="elite">Elite</option>
                  <option value="founding">Founding</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#ccc', padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
                <input type="checkbox" checked={compCancelSub} onChange={e => setCompCancelSub(e.target.checked)} style={{ accentColor: '#ef4444' }} />
                Also cancel their Stripe subscription immediately
              </label>
              {compCancelSub && <div style={{ fontSize: '12px', color: '#f59e0b', background: '#f59e0b18', padding: '8px 12px', borderRadius: '6px' }}>⚠️ This will immediately cancel their recurring billing in Stripe. They will keep their comped access.</div>}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button onClick={() => setShowComp(false)} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', color: '#888', fontSize: '13px' }}>Cancel</button>
                <button onClick={handleComp} disabled={actionLoading === 'comp'}
                  style={{ background: '#a78bfa', border: 'none', borderRadius: '8px', padding: '9px 20px', cursor: 'pointer', color: '#0a0a0a', fontSize: '13px', fontWeight: 800 }}>
                  {actionLoading === 'comp' ? 'Comping…' : '🎁 Comp Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Referrals Tab ────────────────────────────────────────────────────────────
function ReferralsTab({ profile, referrals }: { profile: Profile; referrals: Referral[] }) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = profile.referral_code ? `${appUrl}/join?ref=${profile.referral_code}` : null;
  const [copied, setCopied] = useState(false);

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activated = referrals.filter(r => r.status === 'activated' || r.referred_user);
  const pending   = referrals.filter(r => r.status === 'pending' && !r.referred_user);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Referral code + link */}
      <Card>
        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Referral Program</h3>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center', background: '#0d0d0d', padding: '16px 24px', borderRadius: '10px', border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--gold)' }}>{referrals.length}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Referrals</div>
          </div>
          <div style={{ textAlign: 'center', background: '#0d0d0d', padding: '16px 24px', borderRadius: '10px', border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#22c55e' }}>{activated.length}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Activated</div>
          </div>
          <div style={{ textAlign: 'center', background: '#0d0d0d', padding: '16px 24px', borderRadius: '10px', border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#888' }}>{pending.length}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</div>
          </div>
        </div>

        {referralLink && (
          <div>
            <Label>Referral Link</Label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <code style={{ flex: 1, background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {referralLink}
              </code>
              <button onClick={copyLink}
                style={{ background: copied ? '#22c55e22' : '#1a1a1a', border: `1px solid ${copied ? '#22c55e44' : '#333'}`, borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', color: copied ? '#22c55e' : '#ccc', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Referral list */}
      <Card>
        <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Referred Members</h3>
        {referrals.length === 0 ? (
          <div style={{ color: '#444', fontSize: '13px', fontStyle: 'italic', padding: '12px 0' }}>No referrals yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {referrals.map(ref => {
              const isActivated = ref.status === 'activated' || !!ref.referred_user;
              const tc = getTierColor((ref.referred_user?.tier as MemberTier) || 'free');
              return (
                <div key={ref.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#0d0d0d', borderRadius: '8px', border: '1px solid #1e1e1e' }}>
                  {ref.referred_user?.avatar_url ? (
                    <img src={ref.referred_user.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#555', flexShrink: 0 }}>
                      {(ref.referred_user?.full_name || ref.referred_email)[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ref.referred_user?.full_name || ref.referred_email}
                    </div>
                    <div style={{ fontSize: '11px', color: '#555' }}>{ref.referred_email} · {fmtDateStr(ref.created_at)}</div>
                  </div>
                  {ref.referred_user?.tier && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: tc, background: `${tc}18`, padding: '2px 8px', borderRadius: '8px', flexShrink: 0 }}>
                      {ref.referred_user.tier}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', fontWeight: 700, flexShrink: 0, color: isActivated ? '#22c55e' : '#888', background: isActivated ? '#22c55e18' : '#1a1a1a', padding: '2px 8px', borderRadius: '8px' }}>
                    {isActivated ? '✓ Activated' : '⏳ Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MemberDetailView({ profile: initialProfile, lastLogin, referrals }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [tab, setTab] = useState<'profile' | 'billing' | 'referrals'>('profile');
  const tc = getTierColor(profile.tier);

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: '👤' },
    { id: 'billing' as const, label: 'Billing', icon: '💳' },
    { id: 'referrals' as const, label: 'Referrals', icon: '🔗' },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px' }}>
      {/* Back nav */}
      <button onClick={() => router.push('/admin/members')}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
        ← Back to Members
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${tc}` }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${tc}22`, border: `2px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: tc }}>
            {profile.full_name[0]}
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>{profile.full_name}</h1>
            <span style={{ fontSize: '12px', fontWeight: 700, color: tc, border: `1px solid ${tc}`, padding: '2px 10px', borderRadius: '20px' }}>
              {getTierLabel(profile.tier)}
            </span>
            {profile.is_comped && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', background: '#a78bfa18', padding: '2px 8px', borderRadius: '10px', border: '1px solid #a78bfa44' }}>
                🎁 Comped
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>@{profile.username} · {profile.email}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', padding: '10px 20px', cursor: 'pointer',
            fontSize: '14px', fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? '#c9a84c' : 'var(--muted)',
            borderBottom: tab === t.id ? '2px solid #c9a84c' : '2px solid transparent',
            marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profile' && (
        <ProfileTab
          profile={profile}
          lastLogin={lastLogin}
          onUpdate={updates => setProfile(prev => ({ ...prev, ...updates }))}
        />
      )}
      {tab === 'billing' && <BillingTab profile={profile} />}
      {tab === 'referrals' && <ReferralsTab profile={profile} referrals={referrals} />}
    </div>
  );
}
