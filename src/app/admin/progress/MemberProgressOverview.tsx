'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTierColor, getTierLabel, getInitials } from '@/types';

interface MemberStat {
  id: string;
  full_name: string;
  avatar_url?: string;
  tier: string;
  username: string;
  email: string;
  coursesStarted: number;
  totalLessonsCompleted: number;
  avgCourseCompletion: number;
  challengesJoined: number;
  challengesCompleted: number;
  totalCheckins: number;
  lastActive: string | null;
}

type SortKey = 'name' | 'courses' | 'lessons' | 'avgPct' | 'challenges' | 'checkins' | 'lastActive';

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function MiniBar({ pct, color = 'var(--gold)' }: { pct: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 5, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

export default function MemberProgressOverview({ members }: { members: MemberStat[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastActive');
  const [sortAsc, setSortAsc] = useState(false);
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filtered = members
    .filter(m => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q);
      const matchTier = tierFilter === 'all' || m.tier === tierFilter;
      return matchSearch && matchTier;
    })
    .sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      if (sortKey === 'name') { va = a.full_name || ''; vb = b.full_name || ''; }
      else if (sortKey === 'courses') { va = a.coursesStarted; vb = b.coursesStarted; }
      else if (sortKey === 'lessons') { va = a.totalLessonsCompleted; vb = b.totalLessonsCompleted; }
      else if (sortKey === 'avgPct') { va = a.avgCourseCompletion; vb = b.avgCourseCompletion; }
      else if (sortKey === 'challenges') { va = a.challengesJoined; vb = b.challengesJoined; }
      else if (sortKey === 'checkins') { va = a.totalCheckins; vb = b.totalCheckins; }
      else if (sortKey === 'lastActive') { va = a.lastActive || ''; vb = b.lastActive || ''; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortHeader({ label, sk }: { label: string; sk: SortKey }) {
    const active = sortKey === sk;
    return (
      <th
        onClick={() => toggleSort(sk)}
        style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: active ? 'var(--gold)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', borderBottom: '1px solid var(--border)' }}
      >
        {label} {active ? (sortAsc ? '↑' : '↓') : ''}
      </th>
    );
  }

  // Summary stats
  const totalWithCourses = members.filter(m => m.coursesStarted > 0).length;
  const totalWithChallenges = members.filter(m => m.challengesJoined > 0).length;
  const avgCompletion = members.length > 0
    ? Math.round(members.filter(m => m.avgCourseCompletion > 0).reduce((s, m) => s + m.avgCourseCompletion, 0) / (members.filter(m => m.avgCourseCompletion > 0).length || 1))
    : 0;
  const totalCheckins = members.reduce((s, m) => s + m.totalCheckins, 0);

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px' }}>Member Progress</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>Track course completion and challenge activity across all members.</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Members in Courses', value: totalWithCourses, sub: `of ${members.length} total`, color: '#3b82f6' },
          { label: 'Avg Course Completion', value: `${avgCompletion}%`, sub: 'across active learners', color: 'var(--gold)' },
          { label: 'Members in Challenges', value: totalWithChallenges, sub: `of ${members.length} total`, color: '#10b981' },
          { label: 'Total Check-ins', value: totalCheckins.toLocaleString(), sub: 'all time', color: '#8b5cf6' },
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: card.color, marginBottom: '4px' }}>{card.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{card.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search members…"
          style={{ flex: 1, minWidth: '200px', background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
        />
        <select
          value={tierFilter} onChange={e => setTierFilter(e.target.value)}
          style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}
        >
          <option value="all">All Tiers</option>
          <option value="founding">Founding</option>
          <option value="elite">Elite</option>
          <option value="core">Core</option>
          <option value="free">Free</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#0d0d0d' }}>
              <tr>
                <SortHeader label="Member" sk="name" />
                <SortHeader label="Courses" sk="courses" />
                <SortHeader label="Lessons Done" sk="lessons" />
                <SortHeader label="Avg Completion" sk="avgPct" />
                <SortHeader label="Challenges" sk="challenges" />
                <SortHeader label="Check-ins" sk="checkins" />
                <SortHeader label="Last Active" sk="lastActive" />
                <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                    No members match your search.
                  </td>
                </tr>
              ) : filtered.map((m, i) => {
                const tc = getTierColor(m.tier as 'free'|'core'|'elite'|'founding');
                return (
                  <tr
                    key={m.id}
                    onClick={() => router.push(`/admin/progress/${m.id}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Member */}
                    <td style={{ padding: '14px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: tc, overflow: 'hidden', flexShrink: 0 }}>
                          {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(m.full_name || '?')}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{m.full_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            <span style={{ color: tc, fontWeight: 600 }}>{getTierLabel(m.tier as 'free'|'core'|'elite'|'founding')}</span>
                            {' · '}@{m.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Courses started */}
                    <td style={{ padding: '14px', fontSize: '14px', fontWeight: 600, color: m.coursesStarted > 0 ? '#3b82f6' : 'var(--muted)' }}>
                      {m.coursesStarted > 0 ? m.coursesStarted : '—'}
                    </td>
                    {/* Lessons done */}
                    <td style={{ padding: '14px', fontSize: '14px', fontWeight: 600, color: m.totalLessonsCompleted > 0 ? 'var(--text)' : 'var(--muted)' }}>
                      {m.totalLessonsCompleted > 0 ? m.totalLessonsCompleted : '—'}
                    </td>
                    {/* Avg completion */}
                    <td style={{ padding: '14px', minWidth: '120px' }}>
                      {m.coursesStarted > 0 ? (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)', marginBottom: '4px' }}>{m.avgCourseCompletion}%</div>
                          <MiniBar pct={m.avgCourseCompletion} />
                        </div>
                      ) : <span style={{ color: 'var(--muted)', fontSize: '13px' }}>—</span>}
                    </td>
                    {/* Challenges joined */}
                    <td style={{ padding: '14px' }}>
                      {m.challengesJoined > 0 ? (
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>{m.challengesJoined}</span>
                          {m.challengesCompleted > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>({m.challengesCompleted} done)</span>
                          )}
                        </div>
                      ) : <span style={{ color: 'var(--muted)', fontSize: '13px' }}>—</span>}
                    </td>
                    {/* Check-ins */}
                    <td style={{ padding: '14px', fontSize: '14px', fontWeight: 600, color: m.totalCheckins > 0 ? '#8b5cf6' : 'var(--muted)' }}>
                      {m.totalCheckins > 0 ? m.totalCheckins : '—'}
                    </td>
                    {/* Last active */}
                    <td style={{ padding: '14px', fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {m.lastActive ? timeAgo(m.lastActive) : <span style={{ fontStyle: 'italic' }}>No activity</span>}
                    </td>
                    {/* Action */}
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>View →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)' }}>
          Showing {filtered.length} of {members.length} members
        </div>
      </div>
    </div>
  );
}
