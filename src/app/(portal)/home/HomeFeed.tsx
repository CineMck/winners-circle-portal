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
  isAdmin: boolean;
}

export default function HomeFeed({ profile, initialPosts, topMembers, isAdmin }: Props) {
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
        {/* Header banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '28px' }}>📣</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--gold)' }}>
              Announcements &amp; Updates
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
              Official posts from The Winner&apos;s Circle team · Member discussion lives in{' '}
              <Link href="/community" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Community →</Link>
            </div>
          </div>
        </div>

        {/* Admin composer — only visible to admins/mods */}
        {isAdmin && (
          <PostComposer
            currentUser={profile}
            channelId={undefined}
            allowNoChannel
            placeholder="Post an announcement to all members…"
            onPostCreated={handleNewPost}
          />
        )}

        {posts.length === 0 ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📣</div>
            <h3 style={{ marginBottom: '8px' }}>No announcements yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Check back soon — team updates and announcements will appear here.
            </p>
            <Link href="/community" className="btn-gold" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', fontSize: '13px' }}>
              Go to Community →
            </Link>
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
              background: profile?.avatar_url ? 'transparent' : 'var(--gold-dim)',
              border: `2px solid ${getTierColor(profile?.tier || 'free')}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 700, color: getTierColor(profile?.tier || 'free'),
              overflow: 'hidden',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (profile?.full_name || 'U').slice(0, 2).toUpperCase()}
            </div>
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
              textDecoration: 'none',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, width: '20px', color: i === 0 ? 'var(--gold)' : 'var(--muted)' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: member.avatar_url ? 'transparent' : 'var(--gold-dim)',
                border: `1px solid ${getTierColor(member.tier || 'free')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: getTierColor(member.tier || 'free'),
                overflow: 'hidden', flexShrink: 0,
              }}>
                {member.avatar_url
                  ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (member.full_name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{member.full_name}</div>
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
            { href: '/community/accountability', icon: '📋', label: '#accountability' },
            { href: '/referrals', icon: '🔗', label: 'Refer a Friend' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0',
              fontSize: '13px', color: 'var(--muted)', borderBottom: '1px solid var(--border-subtle, #161616)',
              textDecoration: 'none',
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
