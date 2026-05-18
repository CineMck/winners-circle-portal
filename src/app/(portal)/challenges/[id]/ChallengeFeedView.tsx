'use client';
import { useState } from 'react';
import { Challenge, ChallengeParticipation, Post, Profile, canAccessTier, getTierLabel } from '@/types';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Props {
  challenge: Challenge;
  profile: Profile;
  participation: ChallengeParticipation | null;
  initialPosts: Post[];
  participantCount: number;
}

export default function ChallengeFeedView({ challenge, profile, participation, initialPosts, participantCount }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [currentParticipation, setCurrentParticipation] = useState(participation);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const hasAccess = canAccessTier(profile?.tier || 'free', challenge.tier_required);
  const isEnrolled = !!currentParticipation;
  const isCompleted = ['completed', 'verified'].includes(currentParticipation?.status || '');

  async function joinChallenge() {
    setLoading(true);
    const { data } = await supabase
      .from('challenge_participations')
      .insert({ challenge_id: challenge.id, user_id: profile.id })
      .select('*')
      .single();
    if (data) setCurrentParticipation(data as ChallengeParticipation);
    setLoading(false);
  }

  async function markComplete() {
    if (!confirm('Mark this challenge as completed?')) return;
    setLoading(true);
    await supabase.from('challenge_participations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', currentParticipation!.id);
    // Award XP
    await supabase.from('profiles').update({ xp_points: (profile.xp_points || 0) + challenge.xp_reward }).eq('id', profile.id);
    setCurrentParticipation(prev => prev ? { ...prev, status: 'completed' } : prev);
    setLoading(false);
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ marginBottom: '8px' }}>This challenge is for {getTierLabel(challenge.tier_required)}+ members</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>Upgrade to access this challenge and earn XP.</p>
        <Link href="/upgrade" className="btn-gold" style={{ padding: '12px 28px', display: 'inline-block' }}>Upgrade Membership</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      {/* Challenge header */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              {challenge.badge_icon && <span style={{ fontSize: '36px' }}>{challenge.badge_icon}</span>}
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{challenge.title}</h1>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
              {challenge.description}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>⚡</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>+{challenge.xp_reward} XP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>👥 {participantCount} participants</span>
              </div>
              {challenge.badge_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--muted)' }}>🏅 Earns: {challenge.badge_name}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0, marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!isEnrolled && (
              <button onClick={joinChallenge} disabled={loading} className="btn-gold" style={{ padding: '10px 24px' }}>
                {loading ? '…' : 'Join Challenge'}
              </button>
            )}
            {isEnrolled && !isCompleted && (
              <button onClick={markComplete} disabled={loading} style={{
                background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px',
                padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
              }}>
                ✅ Mark Complete
              </button>
            )}
            {isCompleted && (
              <div style={{ padding: '10px 24px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '14px' }}>✅ Completed!</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>+{challenge.xp_reward} XP earned</div>
              </div>
            )}
          </div>
        </div>

        {/* Instruction video */}
        {challenge.instructions_video_url && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📹 Instructions
            </div>
            <video src={challenge.instructions_video_url} controls style={{ width: '100%', maxHeight: '360px', borderRadius: '12px', background: '#000' }} />
          </div>
        )}
      </div>

      {/* Progress feed */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
        📸 Progress Feed <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '14px' }}>({posts.length} posts)</span>
      </h2>

      {isEnrolled && (
        <PostComposer
          currentUser={profile}
          challengeId={challenge.id}
          placeholder="Share your progress on this challenge…"
          onPostCreated={post => setPosts(prev => [post as Post, ...prev])}
        />
      )}

      {posts.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
          <p style={{ color: 'var(--muted)' }}>
            {isEnrolled ? "No progress posts yet. Share your first update!" : "Join this challenge to see and post progress."}
          </p>
        </div>
      ) : posts.map(post => (
        <PostCard key={post.id} post={post} currentUser={profile}
          onPin={(id, pinned) => setPosts(prev => prev.map(p => p.id === id ? { ...p, is_pinned: pinned } : p))}
          onRemove={id => setPosts(prev => prev.filter(p => p.id !== id))} />
      ))}
    </div>
  );
}
