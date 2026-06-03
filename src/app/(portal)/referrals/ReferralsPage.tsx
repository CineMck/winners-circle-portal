'use client';
import { useState } from 'react';
import { Profile } from '@/types';
import { formatDate } from '@/lib/utils';

interface Referral {
  id: string;
  referred_email: string;
  status: string;
  reward_paid: boolean;
  created_at: string;
  referred_user?: { full_name: string; tier: string };
}

export default function ReferralsPage({ profile, referrals: initialReferrals }: { profile: Profile; referrals: Referral[] }) {
  const [referrals, setReferrals] = useState<Referral[]>(initialReferrals);
  const [email, setEmail] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function deleteReferral(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/referrals/delete?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Could not delete: ' + (data.error ?? res.statusText));
      } else {
        setReferrals(prev => prev.filter(r => r.id !== id));
      }
    } catch {
      alert('Network error — please try again.');
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${profile?.username}`;

  async function sendReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/referrals/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), personalNote: personalNote.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not send invite');
      } else {
        setSent(true);
        setEmail('');
        setPersonalNote('');
        setTimeout(() => setSent(false), 4000);
      }
    } catch {
      setError('Network error — please try again.');
    }
    setSending(false);
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
        <form onSubmit={sendReferral} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="friend@example.com" required
              style={{
                flex: 1, minWidth: '200px', background: '#161616', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
              }} />
            <button type="submit" disabled={sending} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>
              {sent ? '✅ Sent!' : sending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
          <textarea
            value={personalNote}
            onChange={e => setPersonalNote(e.target.value)}
            placeholder="(Optional) Add a personal note — e.g. 'Thought of you for this. The community is amazing.'"
            rows={2}
            maxLength={400}
            style={{
              width: '100%', background: '#161616', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '13px',
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
            We&apos;ll email them a personalized invite with your referral link.
          </div>
        </form>
        {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>⚠️ {error}</div>}
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
          {referrals.map(r => {
            const isPending = r.status === 'pending' && !r.referred_user;
            const isConfirming = confirmDeleteId === r.id;
            return (
              <div key={r.id} className="card" style={{ padding: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.referred_user?.full_name || r.referred_email}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{formatDate(r.created_at)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                    background: r.status === 'converted' ? 'rgba(34,197,94,0.1)' : 'rgba(201,168,76,0.1)',
                    color: r.status === 'converted' ? '#22c55e' : 'var(--gold)',
                    border: `1px solid ${r.status === 'converted' ? '#22c55e' : 'var(--gold)'}`,
                  }}>
                    {r.status === 'converted' ? '✅ Joined' : '⏳ Pending'}
                  </span>
                  {isPending && (
                    isConfirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: '#ef4444', whiteSpace: 'nowrap' }}>Sure?</span>
                        <button
                          onClick={() => deleteReferral(r.id)}
                          disabled={deletingId === r.id}
                          style={{ background: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 700 }}
                        >
                          {deletingId === r.id ? '…' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--muted)' }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        title="Delete invite"
                        style={{
                          background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                          padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#ef4444',
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
