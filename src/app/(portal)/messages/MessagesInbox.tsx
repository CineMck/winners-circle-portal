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
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesInbox({ profile, conversations, members }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [starting, setStarting] = useState(false);

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.username?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  async function startConversation(recipientId: string) {
    setStarting(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId }),
    });
    const { conversationId } = await res.json();
    router.push(`/messages/${conversationId}`);
  }

  const filtered = conversations.filter(c =>
    c.other?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '700px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>💬 Messages</h1>
        <button onClick={() => setShowNewDM(!showNewDM)} className="btn-gold" style={{ padding: '9px 18px', fontSize: '13px' }}>
          {showNewDM ? '× Cancel' : '+ New Message'}
        </button>
      </div>

      {/* New DM picker */}
      {showNewDM && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '10px' }}>Send a message to…</div>
          <input
            value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
            placeholder="Search members…" autoFocus
            style={{ width: '100%', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredMembers.slice(0, 20).map(m => (
              <button key={m.id} onClick={() => startConversation(m.id)} disabled={starting}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', background: 'none', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${getTierColor(m.tier as 'free'|'core'|'elite'|'founding')}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: getTierColor(m.tier as 'free'|'core'|'elite'|'founding'), overflow: 'hidden', flexShrink: 0 }}>
                  {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(m.full_name)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{m.full_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>@{m.username}</div>
                </div>
              </button>
            ))}
            {filteredMembers.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '13px', padding: '8px' }}>No members found.</p>}
          </div>
        </div>
      )}

      {/* Search */}
      {conversations.length > 3 && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
          style={{ width: '100%', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }} />
      )}

      {/* Conversation list */}
      {filtered.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No messages yet. Start a conversation with a member!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {filtered.map(conv => {
          const isUnread = conv.lastMessage && (!conv.lastReadAt || new Date(conv.lastMessage.created_at) > new Date(conv.lastReadAt)) && conv.lastMessage.sender_id !== profile.id;
          const tc = getTierColor(conv.other?.tier as 'free'|'core'|'elite'|'founding' || 'free');
          return (
            <div key={conv.conversationId} onClick={() => router.push(`/messages/${conv.conversationId}`)}
              className="card"
              style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', border: isUnread ? '1px solid var(--gold)' : '1px solid var(--border)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: tc, overflow: 'hidden', flexShrink: 0 }}>
                {conv.other?.avatar_url ? <img src={conv.other.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(conv.other?.full_name || '?')}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: isUnread ? 700 : 600 }}>{conv.other?.full_name}</span>
                  {conv.lastMessage && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{timeAgo(conv.lastMessage.created_at)}</span>}
                </div>
                {conv.lastMessage && (
                  <div style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px', fontWeight: isUnread ? 600 : 400 }}>
                    {conv.lastMessage.sender_id === profile.id ? 'You: ' : ''}{conv.lastMessage.content}
                  </div>
                )}
              </div>
              {isUnread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
