'use client';
import { useState } from 'react';
import { Profile } from '@/types';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface Referral {
  id: string;
  referred_email: string;
  status: string;
  reward_paid: boolean;
  created_at: string;
  referred_user?: { full_name: string; tier: string };
}

export default function ReferralsPage({ profile, referrals }: { profile: Profile; referrals: Referral[] }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${profile?.username}`;

  async function sendReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError('');
    const { error } = await supabase.from('referrals').insert({ referrer_id: profile.id, referred_email: email });
    setSending(false);
    if (error) setError(error.message);
    else { setSent(true); setEmail(''); setTimeout(() => setSent(false), 3000); }
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
  }

  const pending = referrals.filter(r => r.status === 'pending').length;
  const converted = referrals.filter(r => r.status === 'converted').length;

  return (
    <div style={{ padding: '24px', maxWidth: '760px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🔗 Referrals</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
        Invite people to the Winner&apos;s Circle and earn rewards when they join.
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Referrals', value: referrals.length, icon: '🔗' },
          { label: 'Pending', value: pending, icon: '⏳' },
          { label: 'Converted', value: converted, icon: '✅' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px' }}>{s.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Your Referral Link
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input readOnly value={referralLink} style={{
            flex: 1, background: '#161616', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '10px 14px', color: 'var(--muted)', fontSize: '13px',
          }} />
          <button onClick={copyLink} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>Copy</button>
        </div>
      </div>

      {/* Send invite */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Invite by Email
        </div>
        <form onSubmit={sendReferral} style={{ display: 'flex', gap: '8px' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="friend@example.com" required
            style={{
              flex: 1, background: '#161616', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
            }} />
          <button type="submit" disabled={sending} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>
            {sent ? '✅ Sent!' : sending ? '…' : 'Invite'}
          </button>
        </form>
        {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>{error}</div>}
      </div>

      {/* Referral history */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>History</h2>
      {referrals.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
          <p style={{ color: 'var(--muted)' }}>No referrals yet. Share your link to get started!</p>
        </div>
      ) : (
        <div>
          {referrals.map(r => (
            <div key={r.id} className="card" style={{ padding: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {r.referred_user?.full_name || r.referred_email}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{formatDate(r.created_at)}</div>
              </div>
              <span style={{
                fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                background: r.status === 'converted' ? 'rgba(34,197,94,0.1)' : 'rgba(201,168,76,0.1)',
                color: r.status === 'converted' ? '#22c55e' : 'var(--gold)',
                border: `1px solid ${r.status === 'converted' ? '#22c55e' : 'var(--gold)'}`,
              }}>
                {r.status === 'converted' ? '✅ Joined' : '⏳ Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
