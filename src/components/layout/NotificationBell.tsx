'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Notification } from '@/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data || []));

    // Realtime subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        position: 'relative', padding: '8px', borderRadius: '8px',
        color: 'var(--text)', fontSize: '18px',
      }}>
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            background: 'var(--gold)', color: '#0a0a0a',
            fontSize: '10px', fontWeight: 700,
            width: '16px', height: '16px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, width: '320px',
          background: 'var(--black-card)', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: 'var(--gold)',
                fontSize: '12px', cursor: 'pointer',
              }}>Mark all read</button>
            )}
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                No notifications yet
              </div>
            ) : notifications.map(notif => {
              const boxStyle: React.CSSProperties = {
                display: 'block', padding: '12px 16px',
                background: notif.is_read ? 'transparent' : 'var(--gold-dim)',
                borderBottom: '1px solid var(--border-subtle, #161616)',
                color: 'inherit', textDecoration: 'none',
              };
              const inner = (
                <>
                  <div style={{ fontSize: '13px', fontWeight: notif.is_read ? 400 : 600 }}>{notif.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{notif.body}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{formatDate(notif.created_at)}</div>
                </>
              );
              return notif.link ? (
                <Link key={notif.id} href={notif.link} onClick={() => setOpen(false)} style={boxStyle}>{inner}</Link>
              ) : (
                <div key={notif.id} style={boxStyle}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
