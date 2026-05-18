'use client';
import { useState } from 'react';
import { Profile, MemberTier, UserRole, getTierColor, getTierLabel } from '@/types';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function MembersAdmin({ initialMembers }: { initialMembers: Profile[] }) {
  const [members, setMembers] = useState<Profile[]>(initialMembers);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<MemberTier | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState<MemberTier>('free');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const filtered = members.filter(m => {
    const matchesSearch = !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === 'all' || m.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  function startEdit(member: Profile) {
    setEditingId(member.id);
    setEditTier(member.tier);
    setEditRole(member.role);
  }

  async function saveEdit(memberId: string) {
    setSaving(true);
    await supabase.from('profiles').update({ tier: editTier, role: editRole }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, tier: editTier, role: editRole } : m));
    setEditingId(null);
    setSaving(false);
  }

  async function removeMember(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from the portal? Their account will be marked as suspended.`)) return;
    await supabase.from('profiles').update({ subscription_status: 'suspended', tier: 'free' }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, subscription_status: 'suspended', tier: 'free' } : m));
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>👥 Members ({filtered.length})</h1>
        <button className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}
          onClick={() => {
            const email = prompt('Member email to add:');
            if (email) alert(`Invite sent to ${email} — connect to email service to activate`);
          }}>
          + Add Member
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'var(--black-card)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
          }}
        />
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value as MemberTier | 'all')}
          style={{
            background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '8px',
            padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none',
          }}>
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="core">Core</option>
          <option value="elite">Elite</option>
          <option value="founding">Founding</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Member', 'Tier', 'Role', 'XP', 'Joined', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(member => {
              const isEditing = editingId === member.id;
              const tierColor = getTierColor(member.tier);
              return (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{member.full_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{member.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <select value={editTier} onChange={e => setEditTier(e.target.value as MemberTier)}
                        style={{ background: '#161616', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text)', fontSize: '13px' }}>
                        {['free', 'core', 'elite', 'founding'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 700, color: tierColor, border: `1px solid ${tierColor}`, padding: '2px 8px', borderRadius: '20px' }}>
                        {getTierLabel(member.tier)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {isEditing ? (
                      <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)}
                        style={{ background: '#161616', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text)', fontSize: '13px' }}>
                        {['member', 'moderator', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: '12px', color: member.role === 'admin' ? '#ef4444' : member.role === 'moderator' ? 'var(--gold)' : 'var(--muted)' }}>
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--gold)', fontWeight: 600 }}>{member.xp_points}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--muted)' }}>{new Date(member.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '12px', color: member.subscription_status === 'suspended' ? '#ef4444' : '#22c55e' }}>
                      {member.subscription_status === 'suspended' ? '🚫 Suspended' : '✅ Active'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(member.id)} disabled={saving}
                            style={{ background: 'var(--gold)', color: '#0a0a0a', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)' }}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(member)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
                            Edit
                          </button>
                          <button onClick={() => removeMember(member.id, member.full_name)}
                            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#ef4444' }}>
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
