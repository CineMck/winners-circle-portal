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
}

export default function ChannelView({ channel, profile, initialPosts }: Props) {
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

  if (!hasAccess) {
    return (
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
    );
  }

  const channelIcons: Record<string, string> = { hash: '#', trophy: '🏆', target: '🎯', 'book-open': '📖', flame: '🔥', crown: '👑' };

  return (
    <div style={{ maxWidth: '760px', padding: '24px' }}>
      {/* Channel header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
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

      <PostComposer currentUser={profile} channelId={channel.id} placeholder={`Post in #${channel.name.toLowerCase()}…`}
        onPostCreated={post => setPosts(prev => [post as Post, ...prev])} />

      {posts.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <p style={{ color: 'var(--muted)' }}>No posts yet. Be the first to start the conversation!</p>
        </div>
      ) : posts.map(post => (
        <PostCard key={post.id} post={post} currentUser={profile}
          onPin={(id, pinned) => setPosts(prev => prev.map(p => p.id === id ? { ...p, is_pinned: pinned } : p))}
          onRemove={id => setPosts(prev => prev.filter(p => p.id !== id))} />
      ))}
    </div>
  );
}
