'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, getTierColor, getInitials } from '@/types';

interface OtherUser { id: string; full_name: string; avatar_url?: string; tier: string; username: string; }
interface ConversationRow {
  conversationId: string;
  isGroup: boolean;
  name: string | null;
  other: OtherUser | null;
  others: OtherUser[];
  lastMessage: { content: string; created_at: string; sender_id: string } | null;
  lastReadAt: string | null;
}

interface Props {
  profile: Profile;
  conversations: ConversationRow[];
  members: OtherUser[];
  isAdmin: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ user, size = 44 }: { user: OtherUser; size?: number }) {
  const tc = getTierColor(user.tier as 'free' | 'core' | 'elite' | 'founding' | 're_promo');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--gold-dim)', border: `2px solid ${tc}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: tc,
      overflow: 'hidden', flexShrink: 0,
    }}>
      {user.avatar_url
        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(user.full_name || '?')}
    </div>
  );
}

function GroupAvatar({ size = 44 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--gold-dim)', border: '2px solid var(--gold)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, flexShrink: 0,
    }}>
      👥
    </div>
  );
}

function convTitle(conv: ConversationRow): string {
  if (conv.isGroup) return conv.name || conv.others.map(o => o?.full_name?.split(' ')[0]).filter(Boolean).join(', ') || 'Group';
  return conv.other?.full_name || 'Member';
}

export default function MessagesInbox({ profile, conversations, members, isAdmin }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'list' | 'new' | 'newGroup'>('list');
  const [memberSearch, setMemberSearch] = useState('');
  const [starting, setStarting] = useState<string | null>(null);
  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState('');

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.username?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  function resetPicker() {
    setMemberSearch('');
    setGroupName('');
    setSelected(new Set());
    setGroupError('');
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function startConversation(recipientId: string) {
    setStarting(recipientId);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId }),
    });
    const json = await res.json();
    if (json.conversationId) {
      router.push(`/messages/${json.conversationId}`);
    } else {
      console.error('Failed to start conversation:', json);
      alert('Could not start conversation. Please try again.');
      setStarting(null);
    }
  }

  async function createGroup() {
    if (creatingGroup) return;
    setGroupError('');
    if (!groupName.trim()) { setGroupError('Give the group a name.'); return; }
    if (selected.size < 2) { setGroupError('Pick at least 2 members.'); return; }
    setCreatingGroup(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientIds: [...selected], name: groupName.trim() }),
    });
    const json = await res.json();
    if (json.conversationId) {
      router.push(`/messages/${json.conversationId}`);
    } else {
      setGroupError(json.error || 'Could not create group. Please try again.');
      setCreatingGroup(false);
    }
  }

  const filtered = conversations.filter(c =>
    !search || convTitle(c).toLowerCase().includes(search.toLowerCase())
  );

  const picking = mode === 'new' || mode === 'newGroup';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-h))', overflow: 'hidden' }}>

      {/* ── Left panel: conversation list ── */}
      <div style={{
        width: '340px', flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--black-card)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Messages</h1>
            <div style={{ display: 'flex', gap: '6px' }}>
              {isAdmin && !picking && (
                <button
                  onClick={() => { setMode('newGroup'); resetPicker(); }}
                  style={{
                    padding: '7px 12px', fontSize: '12px', borderRadius: '8px',
                    background: 'none', border: '1px solid var(--gold)', color: 'var(--gold)',
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  👥 New Group
                </button>
              )}
              <button
                onClick={() => { setMode(picking ? 'list' : 'new'); resetPicker(); }}
                className="btn-gold"
                style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '8px' }}
              >
                {picking ? '✕ Cancel' : '✏️ New'}
              </button>
            </div>
          </div>
          {/* Search bar */}
          {conversations.length > 0 && !picking && (
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{
                width: '100%', background: '#0d0d0d', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 12px', color: 'var(--text)',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        {/* New DM / group member picker */}
        {picking && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600 }}>
              {mode === 'newGroup' ? 'CREATE A GROUP MESSAGE' : 'START A CONVERSATION'}
            </p>
            {mode === 'newGroup' && (
              <input
                value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="Group name (e.g. Elevate Cohort)…" autoFocus maxLength={80}
                style={{
                  width: '100%', background: '#0d0d0d', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '8px 12px', color: 'var(--text)',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px',
                }}
              />
            )}
            <input
              value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members…" autoFocus={mode === 'new'}
              style={{
                width: '100%', background: '#0d0d0d', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 12px', color: 'var(--text)',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {mode === 'newGroup' && (
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={createGroup}
                  disabled={creatingGroup}
                  className="btn-gold"
                  style={{ width: '100%', padding: '9px', fontSize: '13px', borderRadius: '8px' }}
                >
                  {creatingGroup ? 'Creating…' : `Create Group${selected.size > 0 ? ` (${selected.size} member${selected.size === 1 ? '' : 's'})` : ''}`}
                </button>
                {groupError && (
                  <p style={{ fontSize: '12px', color: 'var(--danger)', margin: '8px 0 0', textAlign: 'center' }}>{groupError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {picking ? (
            // Member picker list
            filteredMembers.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No members found.</p>
              </div>
            ) : (
              filteredMembers.slice(0, mode === 'newGroup' ? 100 : 30).map(m => {
                const isSelected = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => mode === 'newGroup' ? toggleSelected(m.id) : startConversation(m.id)}
                    disabled={starting === m.id}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px',
                      background: starting === m.id || (mode === 'newGroup' && isSelected) ? 'var(--gold-dim)' : 'none',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (starting !== m.id && !(mode === 'newGroup' && isSelected)) e.currentTarget.style.background = '#161616'; }}
                    onMouseLeave={e => { if (starting !== m.id && !(mode === 'newGroup' && isSelected)) e.currentTarget.style.background = 'none'; }}
                  >
                    <Avatar user={m} size={40} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{m.full_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>@{m.username}</div>
                    </div>
                    {mode === 'newGroup' && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--gold)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', color: '#0a0a0a', fontWeight: 800,
                      }}>
                        {isSelected ? '✓' : ''}
                      </div>
                    )}
                    {starting === m.id && (
                      <span style={{ fontSize: '11px', color: 'var(--gold)' }}>Opening…</span>
                    )}
                  </button>
                );
              })
            )
          ) : filtered.length === 0 ? (
            // Empty state
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>✉️</div>
              <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6 }}>
                No conversations yet.<br />Hit <strong style={{ color: 'var(--text)' }}>New</strong> to message a member.
              </p>
            </div>
          ) : (
            // Conversation rows
            filtered.map(conv => {
              const isUnread = conv.lastMessage
                && (!conv.lastReadAt || new Date(conv.lastMessage.created_at) > new Date(conv.lastReadAt))
                && conv.lastMessage.sender_id !== profile.id;

              return (
                <div
                  key={conv.conversationId}
                  onClick={() => router.push(`/messages/${conv.conversationId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: isUnread ? '3px solid var(--gold)' : '3px solid transparent',
                    background: 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {conv.isGroup
                      ? <GroupAvatar size={44} />
                      : conv.other && <Avatar user={conv.other} size={44} />}
                    {isUnread && (
                      <div style={{
                        position: 'absolute', top: 0, right: 0,
                        width: 10, height: 10, borderRadius: '50%',
                        background: 'var(--gold)', border: '2px solid var(--black-card)',
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                      <span style={{ fontSize: '14px', fontWeight: isUnread ? 700 : 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {convTitle(conv)}
                      </span>
                      {conv.lastMessage && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', flexShrink: 0, marginLeft: '8px' }}>
                          {timeAgo(conv.lastMessage.created_at)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '12px', color: isUnread ? 'var(--text)' : 'var(--muted)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontWeight: isUnread ? 600 : 400,
                    }}>
                      {conv.isGroup && (
                        <span style={{ color: 'var(--muted)' }}>{conv.others.length + 1} members · </span>
                      )}
                      {conv.lastMessage
                        ? `${conv.lastMessage.sender_id === profile.id ? 'You: ' : ''}${conv.lastMessage.content}`
                        : <span style={{ fontStyle: 'italic' }}>No messages yet</span>
                      }
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: select prompt ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '16px',
      }} className="dm-right-panel">
        <div style={{ fontSize: '56px' }}>💬</div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Your Messages</h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.6 }}>
          Select a conversation or start a new one to begin messaging.
        </p>
        <button
          onClick={() => { setMode('new'); resetPicker(); }}
          className="btn-gold"
          style={{ padding: '10px 24px', fontSize: '14px' }}
        >
          ✏️ New Message
        </button>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .dm-right-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
