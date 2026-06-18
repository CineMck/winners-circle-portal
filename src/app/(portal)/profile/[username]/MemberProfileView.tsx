'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTierColor, getTierLabel, getInitials } from '@/types';
import { formatDate } from '@/lib/utils';

interface Member {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  tier: string;
  xp_points?: number;
  created_at: string;
}

interface Props {
  currentUserId: string;
  member: Member;
  recentPosts: { id: string; content: string; created_at: string; channel?: { name: string; slug: string } | null }[];
  completedChallenges: { id: string; completed_at?: string; challenge?: { title: string; badge_icon?: string; xp_reward: number } | null }[];
}

export default function MemberProfileView({ currentUserId, member, recentPosts, completedChallenges }: Props) {
  const router = useRouter();
  const [messaging, setMessaging] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'challenges'>('activity');

  const tierColor = getTierColor(member.tier as 'free' | 'core' | 'elite' | 'founding');
  const initials = getInitials(member.full_name || member.username || 'U');

  async function handleSendMessage() {
    setMessaging(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: member.id }),
      });
      const json = await res.json();
      if (json.conversationId) {
        router.push(`/messages/${json.conversationId}`);
      }
    } catch {
      setMessaging(false);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      {/* Profile header */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--gold-dim)', border: `3px solid ${tierColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: tierColor,
              overflow: 'hidden', flexShrink: 0,
            }}>
              {member.avatar_url ? (
                <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{member.full_name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span className="tier-label" style={{ fontSize: '13px', color: tierColor, fontWeight: 700, border: `1px solid ${tierColor}`, padding: '2px 8px', borderRadius: '20px' }}>
                  {getTierLabel(member.tier as 'free' | 'core' | 'elite' | 'founding')}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>@{member.username}</span>
              </div>
              {member.bio && <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5 }}>{member.bio}</p>}
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Member since {formatDate(member.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={messaging}
            className="btn-gold"
            style={{ padding: '10px 24px', fontSize: '14px', flexShrink: 0 }}
          >
            {messaging ? 'Opening…' : '✉️ Send Message'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'XP Points', value: member.xp_points || 0, icon: '⚡' },
            { label: 'Challenges', value: completedChallenges.length, icon: '✅' },
            { label: 'Posts', value: recentPosts.length, icon: '💬' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>{stat.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--black-card)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
        {(['activity', 'challenges'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: activeTab === tab ? 'var(--gold-dim)' : 'transparent',
            color: activeTab === tab ? 'var(--gold)' : 'var(--muted)',
            fontWeight: activeTab === tab ? 700 : 400, fontSize: '13px', textTransform: 'capitalize',
          }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'activity' && (
        <div>
          {recentPosts.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--muted)' }}>No posts yet.</p>
            </div>
          ) : recentPosts.map(post => (
            <div key={post.id} className="card" style={{ padding: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                {post.channel ? `#${post.channel.name.toLowerCase()}` : ''} · {formatDate(post.created_at)}
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{post.content.slice(0, 200)}{post.content.length > 200 ? '…' : ''}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'challenges' && (
        <div>
          {completedChallenges.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--muted)' }}>No completed challenges yet.</p>
            </div>
          ) : completedChallenges.map(p => (
            <div key={p.id} className="card" style={{ padding: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>{p.challenge?.badge_icon || '🏅'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.challenge?.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Completed {p.completed_at ? formatDate(p.completed_at) : ''}
                </div>
              </div>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '14px' }}>+{p.challenge?.xp_reward} XP</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
