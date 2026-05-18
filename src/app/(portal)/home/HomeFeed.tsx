'use client';
import { useState } from 'react';
import { Post, Profile } from '@/types';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import { getTierColor, getTierLabel } from '@/lib/utils';
import Link from 'next/link';

interface Props {
  profile: Profile;
  initialPosts: Post[];
  topMembers: Partial<Profile>[];
  generalChannelId?: string;
}

export default function HomeFeed({ profile, initialPosts, topMembers, generalChannelId }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  function handleNewPost(post: unknown) {
    setPosts(prev => [post as Post, ...prev]);
  }
  function handlePin(postId: string, pinned: boolean) {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: pinned } : p));
  }
  function handleRemove(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', padding: '24px', maxWidth: '1100px' }} className="home-grid">
      {/* Feed */}
      <div>
        <PostComposer currentUser={profile} channelId={generalChannelId} onPostCreated={handleNewPost} />
        {posts.length === 0 ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h3 style={{ marginBottom: '8px' }}>The feed is quiet</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Be the first to post something!</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} currentUser={profile} onPin={handlePin} onRemove={handleRemove} />
          ))
        )}
      </div>

      {/* Sidebar widgets */}
      <div className="home-sidebar">
        {/* Member XP card */}
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--gold-dim)', border: `2px solid ${getTierColor(profile?.tier || 'free')}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 700, color: getTierColor(profile?.tier || 'free'),
            }}>{(profile?.full_name || 'U').slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{profile?.full_name}</div>
              <div style={{ fontSize: '12px', color: getTierColor(profile?.tier || 'free') }}>
                {getTierLabel(profile?.tier || 'free')}
              </div>
            </div>
          </div>
          <div style={{ background: '#161616', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gold)' }}>{profile?.xp_points || 0}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>XP Points</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: '14px', textTransform: 'uppercase' }}>
            🏆 Leaderboard
          </div>
          {topMembers.map((member, i) => (
            <Link key={member.id} href={`/profile/${member.username}`} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0',
              borderBottom: i < topMembers.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, width: '20px', color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}
              </span>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--gold-dim)', border: `1px solid ${getTierColor(member.tier || 'free')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: getTierColor(member.tier || 'free'),
              }}>{(member.full_name || 'U').slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{member.full_name}</div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>{member.xp_points} XP</div>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: '14px', textTransform: 'uppercase' }}>
            Quick Links
          </div>
          {[
            { href: '/challenges', icon: '🎯', label: 'Active Challenges' },
            { href: '/community/wins', icon: '🏆', label: '#wins channel' },
            { href: '/community/accountability', icon: '🎯', label: '#accountability' },
            { href: '/referrals', icon: '🔗', label: 'Refer a Friend' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0',
              fontSize: '13px', color: 'var(--muted)', borderBottom: '1px solid var(--border-subtle, #161616)',
            }}>
              <span>{link.icon}</span> {link.label}
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-grid { grid-template-columns: 1fr !important; }
          .home-sidebar { display: none; }
        }
      `}</style>
    </div>
  );
}
