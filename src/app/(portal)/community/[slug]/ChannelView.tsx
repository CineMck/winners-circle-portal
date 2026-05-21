'use client';
import { useState, useCallback } from 'react';
import { Channel, Post, Profile, canAccessTier, getTierLabel } from '@/types';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Props {
  channel: Channel;
  profile: Profile;
  initialPosts: Post[];
  allChannels: Channel[];
}

export default function ChannelView({ channel, profile, initialPosts, allChannels }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const supabase = createClient();
  const hasAccess = canAccessTier(profile?.tier || 'free', channel.tier_required);

  const refreshFeed = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles!author_id(*), channel:channels(*)')
      .eq('channel_id', channel.id)
      .eq('is_removed', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setPosts(data as Post[]);
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, [channel.id, supabase]);

  const channelIcons: Record<string, string> = { hash: '#', trophy: '🏆', target: '🎯', 'book-open': '📖', flame: '🔥', crown: '👑' };

  return (
    <div style={{ maxWidth: '800px' }}>

      {/* ── Channel Tab Bar (desktop only) ─────────────────────── */}
      <div className="channel-tab-bar" style={{
        position: 'sticky', top: 'var(--topbar-h)',
        background: 'var(--black-bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        overflowX: 'auto', overflowY: 'hidden',
        gap: '2px', padding: '0 24px',
        zIndex: 10,
        scrollbarWidth: 'none',
      }}>
        {allChannels.map(ch => {
          const chAccess = canAccessTier(profile?.tier || 'free', ch.tier_required);
          const active = ch.slug === channel.slug;
          return (
            <Link
              key={ch.id}
              href={chAccess ? `/community/${ch.slug}` : '/upgrade'}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '12px 14px',
                borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                color: active ? 'var(--gold)' : chAccess ? 'var(--text)' : 'var(--muted)',
                fontWeight: active ? 700 : 500,
                fontSize: '13px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                opacity: chAccess ? 1 : 0.45,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <span style={{ color: active ? 'var(--gold)' : 'var(--muted)', fontSize: '12px' }}>#</span>
              {ch.name.toLowerCase()}
              {!chAccess && <span style={{ fontSize: '10px', marginLeft: '2px' }}>🔒</span>}
            </Link>
          );
        })}
        <style>{`.channel-tab-bar::-webkit-scrollbar { display: none; }`}</style>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div style={{ padding: '24px' }}>

        {!hasAccess ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ marginBottom: '8px' }}>#{channel.name} is for {getTierLabel(channel.tier_required)}+ members</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
              Upgrade your membership to access this channel and connect with fellow high-performers.
            </p>
            <Link href="/upgrade" className="btn-gold" style={{ padding: '12px 28px', display: 'inline-block' }}>
              Upgrade Membership
            </Link>
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <span>{channelIcons[channel.icon] || '#'}</span>
                  {channel.name}
                </h1>
                {channel.description && (
                  <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>{channel.description}</p>
                )}
              </div>
              <button
                onClick={refreshFeed}
                disabled={refreshing}
                title="Refresh feed"
                style={{
                  flexShrink: 0, background: 'none', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '7px 12px', cursor: refreshing ? 'not-allowed' : 'pointer',
                  color: refreshing ? 'var(--muted)' : 'var(--gold)',
                  fontSize: '18px', lineHeight: 1, transition: 'opacity 0.2s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
                {lastRefreshed && !refreshing && (
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
                    {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </button>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            <PostComposer
              currentUser={profile}
              channelId={channel.id}
              placeholder={`Post in #${channel.name.toLowerCase()}…`}
              onPostCreated={post => setPosts(prev => [post as Post, ...prev])}
            />

            {posts.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <p style={{ color: 'var(--muted)' }}>No posts yet. Be the first to start the conversation!</p>
              </div>
            ) : posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={profile}
                onPin={(id, pinned) => setPosts(prev => prev.map(p => p.id === id ? { ...p, is_pinned: pinned } : p))}
                onRemove={id => setPosts(prev => prev.filter(p => p.id !== id))}
              />
            ))}
          </>
        )}
      </div>

      {/* Desktop: hide channel tab bar on mobile (mobile already has sub-nav in PortalShell) */}
      <style>{`
        @media (max-width: 900px) {
          .channel-tab-bar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
