'use client';
import { useState } from 'react';
import { Profile, ChallengeParticipation, Post, getTierColor, getTierLabel } from '@/types';
import { formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Props {
  profile: Profile;
  completedChallenges: (ChallengeParticipation & { challenge: { title: string; badge_icon?: string; xp_reward: number } })[];
  recentPosts: Post[];
}

export default function ProfilePage({ profile, completedChallenges, recentPosts }: Props) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'challenges' | 'settings'>('activity');
  const supabase = createClient();

  const tierColor = getTierColor(profile?.tier || 'free');

  async function saveProfile() {
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, bio }).eq('id', profile.id);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      {/* Profile header */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--gold-dim)', border: `3px solid ${tierColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: tierColor, flexShrink: 0,
            }}>
              {(profile?.full_name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  style={{ background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text)', fontSize: '18px', fontWeight: 700, width: '200px' }} />
              ) : (
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{profile?.full_name}</h1>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span style={{ fontSize: '13px', color: tierColor, fontWeight: 700, border: `1px solid ${tierColor}`, padding: '2px 8px', borderRadius: '20px' }}>
                  {getTierLabel(profile?.tier || 'free')}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>@{profile?.username}</span>
              </div>
              {editing ? (
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a bio…" rows={2}
                  style={{ marginTop: '8px', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', color: 'var(--text)', fontSize: '13px', width: '100%', resize: 'none' }} />
              ) : (
                profile?.bio && <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '8px' }}>{profile.bio}</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
            {editing ? (
              <>
                <button onClick={saveProfile} disabled={saving} className="btn-gold" style={{ padding: '8px 20px', fontSize: '13px' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-outline" style={{ padding: '8px 20px', fontSize: '13px' }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-outline" style={{ padding: '8px 20px', fontSize: '13px' }}>Edit Profile</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'XP Points', value: profile?.xp_points || 0, icon: '⚡' },
            { label: 'Challenges', value: completedChallenges.length, icon: '✅' },
            { label: 'Followers', value: profile?.followers_count || 0, icon: '👥' },
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
        {(['activity', 'challenges', 'settings'] as const).map(tab => (
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
              <p style={{ color: 'var(--muted)' }}>No posts yet. Start contributing to the community!</p>
            </div>
          ) : recentPosts.map(post => (
            <div key={post.id} className="card" style={{ padding: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                {post.channel ? `#${post.channel.name.toLowerCase()}` : '🎯 Challenge post'} · {formatDate(post.created_at)}
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
              <Link href="/challenges" className="btn-gold" style={{ padding: '10px 24px', display: 'inline-block', marginTop: '12px' }}>Browse Challenges</Link>
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

      {activeTab === 'settings' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Membership</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#161616', borderRadius: '10px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{getTierLabel(profile?.tier || 'free')} Plan</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Status: {profile?.subscription_status || 'active'}</div>
            </div>
            <Link href="/upgrade" className="btn-gold" style={{ padding: '8px 20px', fontSize: '13px' }}>
              {profile?.tier === 'founding' ? 'Manage' : 'Upgrade'}
            </Link>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            To manage billing, cancel, or update your payment method, use the{' '}
            <Link href="/api/stripe/portal" style={{ color: 'var(--gold)' }}>Stripe Customer Portal</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
