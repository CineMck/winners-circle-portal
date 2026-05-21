'use client';
import { useState } from 'react';

const TIER_COLORS: Record<string, string> = {
  core: '#c9a84c',
  elite: '#e0c068',
  founding: '#ffd700',
};

const TIER_LABELS: Record<string, string> = {
  core: 'Core Member',
  elite: 'Elite Member',
  founding: 'Founding Member',
};

interface Member {
  id: string;
  full_name: string;
  email: string;
  tier: string;
  role: string;
  phone: string | null;
  birthday: string | null;
  industry: string | null;
  goals_12_months: string | null;
  goals_30_days: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Props {
  members: Member[];
  lastLoginMap: Record<string, string | null>;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatLastLogin(iso: string | null | undefined) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function NewMembersView({ members, lastLoginMap }: Props) {
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = members.filter(m => {
    if (tierFilter !== 'all' && m.tier !== tierFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.industry?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const tierCounts = {
    core: members.filter(m => m.tier === 'core').length,
    elite: members.filter(m => m.tier === 'elite').length,
    founding: members.filter(m => m.tier === 'founding').length,
  };

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>🌟 Paid Members</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
        {members.length} paid member{members.length !== 1 ? 's' : ''} — full profiles, questionnaire answers, and contact details.
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {(['core', 'elite', 'founding'] as const).map(t => (
          <div key={t} style={{
            background: 'var(--black-card)', border: `1px solid ${TIER_COLORS[t]}33`,
            borderRadius: '10px', padding: '16px',
            cursor: 'pointer',
            outline: tierFilter === t ? `2px solid ${TIER_COLORS[t]}` : 'none',
          }} onClick={() => setTierFilter(tierFilter === t ? 'all' : t)}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: TIER_COLORS[t] }}>{tierCounts[t]}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{TIER_LABELS[t]}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, industry…"
          style={{
            background: 'var(--black-card)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '9px 14px', color: 'var(--text)',
            fontSize: '13px', outline: 'none', width: '260px',
          }}
        />
        {['all', 'core', 'elite', 'founding'].map(t => (
          <button key={t} onClick={() => setTierFilter(t)} style={{
            padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', border: '1px solid',
            background: tierFilter === t ? (TIER_COLORS[t] || 'var(--gold)') : 'transparent',
            color: tierFilter === t ? '#0a0a0a' : 'var(--muted)',
            borderColor: tierFilter === t ? (TIER_COLORS[t] || 'var(--gold)') : 'var(--border)',
          }}>
            {t === 'all' ? 'All' : TIER_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Member cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>No members found.</div>
        )}
        {filtered.map(m => {
          const isOpen = expanded === m.id;
          const tc = TIER_COLORS[m.tier] || 'var(--gold)';
          const hasQuestions = m.industry || m.goals_12_months || m.goals_30_days;

          return (
            <div key={m.id} style={{
              background: 'var(--black-card)', border: `1px solid var(--border)`,
              borderRadius: '12px', overflow: 'hidden',
              borderLeft: `3px solid ${tc}`,
            }}>
              {/* Header row */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : m.id)}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: m.avatar_url ? 'transparent' : `${tc}22`,
                  border: `2px solid ${tc}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: tc, overflow: 'hidden',
                }}>
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(m.full_name || m.email)}
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{m.full_name || '(No name)'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>{m.email}</div>
                </div>

                {/* Tier badge */}
                <div style={{
                  fontSize: '11px', fontWeight: 700, color: tc,
                  border: `1px solid ${tc}`, padding: '3px 10px', borderRadius: '20px',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {TIER_LABELS[m.tier] || m.tier}
                </div>

                {/* Joined */}
                <div style={{ fontSize: '12px', color: 'var(--muted)', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                  <div>Joined {formatDate(m.created_at)}</div>
                  <div style={{ color: lastLoginMap[m.id] ? 'var(--text)' : 'var(--muted)' }}>
                    Last login: {formatLastLogin(lastLoginMap[m.id])}
                  </div>
                </div>

                {/* Expand arrow */}
                <div style={{ color: 'var(--muted)', fontSize: '14px', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                  ▼
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                  {/* Contact info */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Contact Details
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <InfoRow label="Email" value={m.email} isLink={`mailto:${m.email}`} />
                      <InfoRow label="Phone" value={m.phone} />
                      <InfoRow label="Birthday" value={formatDate(m.birthday)} />
                      <InfoRow label="Industry" value={m.industry} />
                      <InfoRow label="Member Since" value={formatDate(m.created_at)} />
                      <InfoRow label="Last Login" value={formatLastLogin(lastLoginMap[m.id])} />
                    </div>
                  </div>

                  {/* Goals */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Goals & Questionnaire
                    </div>
                    {!hasQuestions ? (
                      <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>
                        This member hasn&apos;t completed the questionnaire yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {m.goals_12_months && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: tc, marginBottom: '4px' }}>12-MONTH GOALS</div>
                            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              {m.goals_12_months}
                            </div>
                          </div>
                        )}
                        {m.goals_30_days && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: tc, marginBottom: '4px' }}>30-DAY GOALS</div>
                            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              {m.goals_30_days}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string | null | undefined; isLink?: string }) {
  return (
    <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
      <span style={{ color: 'var(--muted)', minWidth: '90px', flexShrink: 0 }}>{label}</span>
      {value && value !== '—' ? (
        isLink
          ? <a href={isLink} style={{ color: 'var(--gold)', textDecoration: 'none' }}>{value}</a>
          : <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
      ) : (
        <span style={{ color: '#444', fontStyle: 'italic' }}>Not provided</span>
      )}
    </div>
  );
}
