'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Profile, MemberTier, UserRole, getTierColor, getTierLabel } from '@/types';

export default function MembersAdmin({ initialMembers }: { initialMembers: Profile[] }) {
  const [members, setMembers] = useState<Profile[]>(initialMembers);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<MemberTier | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState<MemberTier>('free');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [saving, setSaving] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Password reset state
  const [pwResetId, setPwResetId] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ userId: string; text: string; ok: boolean } | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTier, setInviteTier] = useState<MemberTier>('core');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success?: boolean; error?: string; manualLink?: string; warning?: string } | null>(null);

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
    try {
      const res = await fetch('/api/admin/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId, tier: editTier, role: editRole }),
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, tier: editTier, role: editRole } : m));
        setEditingId(null);
      } else {
        const data = await res.json();
        alert('Save failed: ' + (data.error ?? 'Unknown error'));
      }
    } catch {
      alert('Network error — please try again.');
    }
    setSaving(false);
  }

  function startPasswordReset(memberId: string) {
    setPwResetId(memberId);
    setPwValue('');
    setPwMessage(null);
  }

  function generateRandomPassword() {
    // 16 chars, alphanumeric + symbols, safe to copy/paste
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setPwValue(pw);
  }

  async function submitPasswordReset(memberId: string) {
    if (pwValue.length < 8) {
      setPwMessage({ userId: memberId, ok: false, text: 'Min 8 characters' });
      return;
    }
    setPwSaving(true);
    setPwMessage(null);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId, newPassword: pwValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMessage({ userId: memberId, ok: true, text: 'Password updated — share with member securely' });
        setPwResetId(null);
      } else {
        setPwMessage({ userId: memberId, ok: false, text: data.error || 'Reset failed' });
      }
    } catch {
      setPwMessage({ userId: memberId, ok: false, text: 'Network error' });
    }
    setPwSaving(false);
  }

  async function removeMember(memberId: string) {
    const res = await fetch('/api/admin/delete-member', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: memberId }),
    });
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
    }
    setConfirmRemoveId(null);
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    setInviteResult(null);

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          tier: inviteTier,
          message: inviteMessage.trim(),
          inviterName: 'The Winner\'s Circle Team',
        }),
      });
      const data = await res.json();
      setInviteResult(data);
      if (data.success && !data.warning) {
        // Auto-close after success
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteEmail('');
          setInviteMessage('');
          setInviteTier('core');
          setInviteResult(null);
        }, 2000);
      }
    } catch {
      setInviteResult({ error: 'Network error — please try again.' });
    }
    setInviteSending(false);
  }

  const inputStyle = {
    width: '100%', background: '#161616', border: '1px solid #333',
    borderRadius: '8px', padding: '10px 14px', color: '#fff',
    fontSize: '14px', outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>👥 Members ({filtered.length})</h1>
        <button className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}
          onClick={() => { setShowInviteModal(true); setInviteResult(null); }}>
          + Add Member
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
        />
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value as MemberTier | 'all')}
          style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}>
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="core">Core</option>
          <option value="elite">Elevate</option>
          <option value="founding">1-1 Elite</option>
          <option value="re_promo">RE Promo</option>
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
                          <Link href={`/admin/members/${member.id}`}
                            style={{ background: 'var(--gold)', color: '#0a0a0a', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                            View
                          </Link>
                          <button onClick={() => startEdit(member)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
                            Edit
                          </button>
                          <button onClick={() => startPasswordReset(member.id)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}>
                            Password
                          </button>
                          {confirmRemoveId === member.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', color: '#ef4444', whiteSpace: 'nowrap' }}>Sure?</span>
                              <button onClick={() => removeMember(member.id)}
                                style={{ background: '#ef4444', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#fff', fontWeight: 700 }}>
                                Yes
                              </button>
                              <button onClick={() => setConfirmRemoveId(null)}
                                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)' }}>
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmRemoveId(member.id)}
                              style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', color: '#ef4444' }}>
                              Remove
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {(pwResetId === member.id || pwMessage?.userId === member.id) && (
                      <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        {pwResetId === member.id && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={pwValue}
                              onChange={e => setPwValue(e.target.value)}
                              placeholder="New password (min 8 chars)"
                              autoComplete="new-password"
                              style={{ background: '#161616', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'monospace', minWidth: 240 }}
                            />
                            <button type="button" onClick={generateRandomPassword}
                              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>
                              Generate
                            </button>
                            <button onClick={() => submitPasswordReset(member.id)} disabled={pwSaving || pwValue.length < 8}
                              style={{ background: 'var(--gold)', color: '#0a0a0a', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: pwSaving ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, opacity: pwValue.length < 8 ? 0.5 : 1 }}>
                              {pwSaving ? 'Saving…' : 'Set Password'}
                            </button>
                            <button onClick={() => { setPwResetId(null); setPwValue(''); }}
                              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>
                              Cancel
                            </button>
                            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
                              Member is not notified — share the password securely.
                            </span>
                          </div>
                        )}
                        {pwMessage?.userId === member.id && (
                          <div style={{ marginTop: pwResetId === member.id ? 6 : 0, fontSize: 12, color: pwMessage.ok ? '#22c55e' : '#ef4444' }}>
                            {pwMessage.ok ? '✓ ' : '⚠️ '}{pwMessage.text}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Invite Modal ─── */}
      {showInviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }} onClick={e => e.target === e.currentTarget && setShowInviteModal(false)}>
          <div style={{
            background: '#111', border: '1px solid var(--gold)',
            borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--gold)', margin: 0 }}>✉️ Invite Member</h2>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="john@example.com"
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Membership Tier</label>
                <select value={inviteTier} onChange={e => setInviteTier(e.target.value as MemberTier)} style={inputStyle}>
                  <option value="free">Free</option>
                  <option value="core">Core ($150/mo)</option>
                  <option value="elite">Elevate ($495/mo)</option>
                  <option value="founding">1-1 Elite ($497/mo)</option>
                  <option value="re_promo">Real Estate Promo (free)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Personal Message <span style={{ color: '#555' }}>(optional — included in the invite email)</span>
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  placeholder="Hey John, I'd love to have you in the group…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              {/* Result states */}
              {inviteResult?.success && !inviteResult.warning && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px' }}>✅ Invite sent to {inviteEmail}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>They'll receive a branded email with a sign-up link.</div>
                </div>
              )}

              {inviteResult?.warning && (
                <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                    ⚠️ Invite created but email not sent
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>{inviteResult.warning}</div>
                  {inviteResult.manualLink && (
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Share this link manually:</div>
                      <div style={{
                        background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px',
                        padding: '8px 10px', fontSize: '11px', color: '#aaa',
                        wordBreak: 'break-all', cursor: 'text',
                        userSelect: 'all',
                      }}>{inviteResult.manualLink}</div>
                      <button
                        onClick={() => navigator.clipboard.writeText(inviteResult.manualLink!)}
                        style={{ marginTop: '6px', background: 'none', border: '1px solid #444', borderRadius: '6px', padding: '4px 10px', color: 'var(--muted)', cursor: 'pointer', fontSize: '11px' }}>
                        📋 Copy link
                      </button>
                    </div>
                  )}
                  <div style={{ marginTop: '12px', padding: '10px', background: '#0a0a0a', borderRadius: '6px', fontSize: '11px', color: '#666' }}>
                    To enable email sending: add <code style={{ color: 'var(--gold)' }}>RESEND_API_KEY</code> and <code style={{ color: 'var(--gold)' }}>RESEND_FROM_EMAIL</code> to Railway env vars.
                  </div>
                </div>
              )}

              {inviteResult?.error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ color: '#ef4444', fontSize: '13px' }}>⚠️ {inviteResult.error}</div>
                </div>
              )}

              {!inviteResult?.success && (
                <button
                  onClick={sendInvite}
                  disabled={inviteSending || !inviteEmail.trim()}
                  className="btn-gold"
                  style={{ padding: '12px', fontSize: '14px', fontWeight: 700 }}
                >
                  {inviteSending ? '⏳ Sending invite…' : '✉️ Send Invite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
