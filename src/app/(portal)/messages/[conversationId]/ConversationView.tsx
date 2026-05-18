'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, getTierColor, getInitials } from '@/types';
import Link from 'next/link';

interface Message { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; }
interface OtherUser { id: string; full_name: string; avatar_url?: string; tier: string; username: string; }

interface Props {
  conversationId: string;
  profile: Profile;
  otherUser: OtherUser;
  initialMessages: Message[];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationView({ conversationId, profile, otherUser, initialMessages }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const otherTc = getTierColor(otherUser?.tier as 'free'|'core'|'elite'|'founding' || 'free');
  const myTc = getTierColor(profile?.tier || 'free');

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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-h))', maxWidth: '700px' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--black-card)', flexShrink: 0 }}>
        <Link href="/messages" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '20px', marginRight: '4px' }}>←</Link>
        <Link href={`/profile/${otherUser?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${otherTc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: otherTc, overflow: 'hidden', flexShrink: 0 }}>
            {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(otherUser?.full_name || '?')}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{otherUser?.full_name}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>@{otherUser?.username}</div>
          </div>
        </Link>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', margin: 'auto' }}>
            Start the conversation with {otherUser?.full_name?.split(' ')[0]}!
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === profile.id;
          const prevMsg = messages[i - 1];
          const showTime = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;
          const tc = isMine ? myTc : otherTc;
          return (
            <div key={msg.id}>
              {showTime && (
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', margin: '8px 0 4px' }}>
                  {formatTime(msg.created_at)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                {!isMine && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: tc, overflow: 'hidden', flexShrink: 0, marginBottom: '2px' }}>
                    {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(otherUser?.full_name || '?')}
                  </div>
                )}
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
          placeholder={`Message ${otherUser?.full_name?.split(' ')[0]}…`}
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
