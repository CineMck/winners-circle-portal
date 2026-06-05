'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, MemberTier, getTierColor, getInitials } from '@/types';
import Link from 'next/link';

interface Message { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; }
interface OtherUser { id: string; full_name: string; avatar_url?: string; tier: string; username: string; }

interface Props {
  conversationId: string;
  profile: Profile;
  isGroup: boolean;
  groupName: string | null;
  isAdmin: boolean;
  otherUsers: OtherUser[];
  formerMembers: OtherUser[];
  initialMessages: Message[];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function UserBubbleAvatar({ user, size = 28 }: { user?: OtherUser; size?: number }) {
  const tc = getTierColor((user?.tier as MemberTier) || 'free');
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: tc, overflow: 'hidden', flexShrink: 0, marginBottom: '2px' }}>
      {user?.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(user?.full_name || '?')}
    </div>
  );
}

export default function ConversationView({ conversationId, profile, isGroup, groupName, isAdmin, otherUsers, formerMembers, initialMessages }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Manage-members panel (group + admin only)
  const [manageOpen, setManageOpen] = useState(false);
  const [directory, setDirectory] = useState<OtherUser[] | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [manageError, setManageError] = useState('');

  const otherUser = otherUsers[0]; // 1:1 partner
  const usersById: Record<string, OtherUser> = {};
  formerMembers.forEach(u => { if (u) usersById[u.id] = u; });
  otherUsers.forEach(u => { if (u) usersById[u.id] = u; });

  const otherTc = getTierColor((otherUser?.tier as MemberTier) || 'free');
  const myTc = getTierColor(profile?.tier || 'free');

  const title = isGroup
    ? (groupName || otherUsers.map(u => u?.full_name?.split(' ')[0]).filter(Boolean).join(', ') || 'Group')
    : otherUser?.full_name;
  const inputPlaceholder = isGroup
    ? `Message ${groupName || 'the group'}…`
    : `Message ${otherUser?.full_name?.split(' ')[0]}…`;

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id !== profile.id) {
          setMessages(prev => [...prev, msg]);
          // Mark as read
          supabase.from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', profile.id)
            .then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, profile.id, supabase]);

  async function openManage() {
    setManageOpen(true);
    setManageError('');
    if (!directory) {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, tier, username')
        .order('full_name');
      setDirectory((data as OtherUser[]) || []);
    }
  }

  async function changeMembers(payload: { add?: string[]; remove?: string[] }, busy: string) {
    setBusyId(busy);
    setManageError('');
    try {
      const res = await fetch('/api/messages/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setManageError(json.error || 'Something went wrong.');
      } else {
        router.refresh(); // re-fetch participants server-side
      }
    } catch {
      setManageError('Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  const participantIds = new Set([profile.id, ...otherUsers.map(u => u?.id).filter(Boolean)]);
  const addable = (directory || []).filter(m =>
    m.id !== profile.id &&
    !participantIds.has(m.id) &&
    (m.full_name?.toLowerCase().includes(addSearch.toLowerCase()) ||
     m.username?.toLowerCase().includes(addSearch.toLowerCase()))
  );

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`, conversation_id: conversationId,
      sender_id: profile.id, content, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: profile.id, content })
      .select('*')
      .single();

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
      // Update conversation updated_at
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    }
    setSending(false);
  }

  return (
    <div className="dm-conversation" style={{ display: 'flex', flexDirection: 'column', maxWidth: '700px' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--black-card)', flexShrink: 0 }}>
        <Link href="/messages" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '20px', marginRight: '4px' }}>←</Link>
        {isGroup ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
              👥
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {otherUsers.length + 1} members · {otherUsers.map(u => u?.full_name?.split(' ')[0]).filter(Boolean).slice(0, 6).join(', ')}{otherUsers.length > 6 ? '…' : ''}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => manageOpen ? setManageOpen(false) : openManage()}
                style={{
                  padding: '7px 12px', fontSize: '12px', borderRadius: '8px', flexShrink: 0,
                  background: manageOpen ? 'var(--gold-dim)' : 'none',
                  border: '1px solid var(--gold)', color: 'var(--gold)',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                {manageOpen ? '✕ Done' : '⚙️ Manage'}
              </button>
            )}
          </div>
        ) : (
          <Link href={`/profile/${otherUser?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${otherTc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: otherTc, overflow: 'hidden', flexShrink: 0 }}>
              {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(otherUser?.full_name || '?')}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{otherUser?.full_name}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>@{otherUser?.username}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Manage members panel (group + admin only) */}
      {isGroup && isAdmin && manageOpen && (
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--black-card)', maxHeight: '45vh', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '14px 20px 6px' }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, margin: '0 0 8px' }}>
              MEMBERS ({otherUsers.length + 1})
            </p>
            {manageError && (
              <p style={{ fontSize: '12px', color: 'var(--danger)', margin: '0 0 8px' }}>{manageError}</p>
            )}
            {/* You */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
              <UserBubbleAvatar user={{ id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url || undefined, tier: profile.tier, username: profile.username || '' }} size={32} />
              <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                {profile.full_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(you)</span>
              </div>
            </div>
            {/* Other members */}
            {otherUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                <UserBubbleAvatar user={u} size={32} />
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {u.full_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>@{u.username}</span>
                </div>
                <button
                  onClick={() => changeMembers({ remove: [u.id] }, u.id)}
                  disabled={busyId === u.id}
                  style={{
                    padding: '4px 10px', fontSize: '11px', borderRadius: '6px', flexShrink: 0,
                    background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)',
                    fontWeight: 700, cursor: 'pointer', opacity: busyId === u.id ? 0.5 : 1,
                  }}
                >
                  {busyId === u.id ? '…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
          {/* Add members */}
          <div style={{ padding: '8px 20px 16px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, margin: '10px 0 8px' }}>ADD MEMBERS</p>
            <input
              value={addSearch} onChange={e => setAddSearch(e.target.value)}
              placeholder="Search members…"
              style={{
                width: '100%', background: '#0d0d0d', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 12px', color: 'var(--text)',
                fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '6px',
              }}
            />
            {directory === null ? (
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0' }}>Loading members…</p>
            ) : addable.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '8px 0' }}>
                {addSearch ? 'No members match your search.' : 'Everyone is already in this group.'}
              </p>
            ) : (
              addable.slice(0, 20).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                  <UserBubbleAvatar user={m} size={32} />
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {m.full_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>@{m.username}</span>
                  </div>
                  <button
                    onClick={() => changeMembers({ add: [m.id] }, m.id)}
                    disabled={busyId === m.id}
                    style={{
                      padding: '4px 10px', fontSize: '11px', borderRadius: '6px', flexShrink: 0,
                      background: 'none', border: '1px solid var(--gold)', color: 'var(--gold)',
                      fontWeight: 700, cursor: 'pointer', opacity: busyId === m.id ? 0.5 : 1,
                    }}
                  >
                    {busyId === m.id ? '…' : '+ Add'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', margin: 'auto' }}>
            {isGroup ? `Start the conversation in ${title}!` : `Start the conversation with ${otherUser?.full_name?.split(' ')[0]}!`}
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === profile.id;
          const sender = usersById[msg.sender_id];
          const prevMsg = messages[i - 1];
          const showTime = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;
          const newSender = !prevMsg || prevMsg.sender_id !== msg.sender_id;
          const showSenderName = isGroup && !isMine && (newSender || showTime);
          const tc = isMine ? myTc : getTierColor((sender?.tier as MemberTier) || 'free');
          return (
            <div key={msg.id}>
              {showTime && (
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', margin: '8px 0 4px' }}>
                  {formatTime(msg.created_at)}
                </div>
              )}
              {showSenderName && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: tc, margin: '6px 0 2px 38px' }}>
                  {sender?.full_name || 'Member'}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                {!isMine && <UserBubbleAvatar user={isGroup ? sender : otherUser} />}
                <div style={{
                  maxWidth: '70%', padding: '10px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMine ? 'var(--gold)' : '#1e1e1e',
                  color: isMine ? '#0a0a0a' : 'var(--text)',
                  fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', background: 'var(--black-card)', flexShrink: 0 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder={inputPlaceholder}
          style={{ flex: 1, background: '#161616', border: '1px solid var(--border)', borderRadius: '24px', padding: '10px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-gold"
          style={{ padding: '10px 20px', borderRadius: '24px', fontSize: '14px', flexShrink: 0 }}>
          Send
        </button>
      </form>
    </div>
  );
}
