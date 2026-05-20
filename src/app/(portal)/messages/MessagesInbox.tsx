'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, getTierColor, getInitials } from '@/types';

interface OtherUser { id: string; full_name: string; avatar_url?: string; tier: string; username: string; }
interface ConversationRow {
  conversationId: string;
  other: OtherUser;
  lastMessage: { content: string; created_at: string; sender_id: string } | null;
  lastReadAt: string | null;
}

interface Props {
  profile: Profile;
  conversations: ConversationRow[];
  members: OtherUser[];
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
  const tc = getTierColor(user.tier as 'free' | 'core' | 'elite' | 'founding');
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

export default function MessagesInbox({ profile, conversations, members }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.username?.toLowerCase().includes(memberSearch.toLowerCase())
  );

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

  const filtered = conversations.filter(c =>
    !search || c.other?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Messages</h1>
            <button
              onClick={() => { setShowNewDM(!showNewDM); setMemberSearch(''); }}
              className="btn-gold"
              style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '8px' }}
            >
              {showNewDM ? '✕ Cancel' : '✏️ New'}
            </button>
          </div>
          {/* Search bar */}
          {conversations.length > 0 && !showNewDM && (
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

        {/* New DM member picker */}
        {showNewDM && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600 }}>
              START A CONVERSATION
            </p>
            <input
              value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members…" autoFocus
              style={{
                width: '100%', background: '#0d0d0d', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 12px', color: 'var(--text)',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showNewDM ? (
            // Member picker list
            filteredMembers.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No members found.</p>
              </div>
            ) : (
              filteredMembers.slice(0, 30).map(m => (
                <button
                  key={m.id}
                  onClick={() => startConversation(m.id)}
                  disabled={starting === m.id}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', background: starting === m.id ? 'var(--gold-dim)' : 'none',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (starting !== m.id) e.currentTarget.style.background = '#161616'; }}
                  onMouseLeave={e => { if (starting !== m.id) e.currentTarget.style.background = 'none'; }}
                >
                  <Avatar user={m} size={40} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{m.full_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>@{m.username}</div>
                  </div>
                  {starting === m.id && (
                    <span style={{ fontSize: '11px', color: 'var(--gold)' }}>Opening…</span>
                  )}
                </button>
              ))
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
                    <Avatar user={conv.other} size={44} />
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
                      <span style={{ fontSize: '14px', fontWeight: isUnread ? 700 : 600, color: 'var(--text)' }}>
                        {conv.other?.full_name}
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
          onClick={() => setShowNewDM(true)}
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
