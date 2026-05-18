'use client';
import { useState } from 'react';
import { Challenge, ChallengeParticipation, Profile, canAccessTier, getTierColor, getTierLabel } from '@/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Props {
  profile: Profile;
  challenges: Challenge[];
  userParticipations: ChallengeParticipation[];
}

export default function ChallengesPage({ profile, challenges, userParticipations }: Props) {
  const [participations, setParticipations] = useState<ChallengeParticipation[]>(userParticipations);
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const getParticipation = (challengeId: string) => participations.find(p => p.challenge_id === challengeId);

  async function joinChallenge(challengeId: string) {
    setLoading(challengeId);
    const { data } = await supabase
      .from('challenge_participations')
      .insert({ challenge_id: challengeId, user_id: profile.id })
      .select('*')
      .single();
    if (data) setParticipations(prev => [...prev, data as ChallengeParticipation]);
    setLoading(null);
  }

  const enrolled = challenges.filter(c => getParticipation(c.id)?.status === 'enrolled');
  const available = challenges.filter(c => !getParticipation(c.id));
  const completed = challenges.filter(c => ['completed', 'verified'].includes(getParticipation(c.id)?.status || ''));

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🎯 Challenges</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Complete challenges to earn XP, unlock badges, and showcase your progress.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
        {[
          { label: 'Active', value: enrolled.length, icon: '⚡', color: 'var(--gold)' },
          { label: 'Completed', value: completed.length, icon: '✅', color: '#22c55e' },
          { label: 'Total XP', value: `${completed.reduce((sum, c) => sum + (c.xp_reward || 0), 0)}`, icon: '🏆', color: 'var(--gold)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Enrolled challenges */}
      {enrolled.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--gold)' }}>⚡ In Progress</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {enrolled.map(c => <ChallengeCard key={c.id} challenge={c} participation={getParticipation(c.id)} profile={profile} onJoin={joinChallenge} loading={loading === c.id} />)}
          </div>
        </section>
      )}

      {/* Available challenges */}
      {available.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🎯 Available Challenges</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {available.map(c => <ChallengeCard key={c.id} challenge={c} participation={undefined} profile={profile} onJoin={joinChallenge} loading={loading === c.id} />)}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#22c55e' }}>✅ Completed</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {completed.map(c => <ChallengeCard key={c.id} challenge={c} participation={getParticipation(c.id)} profile={profile} onJoin={joinChallenge} loading={loading === c.id} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ChallengeCard({ challenge, participation, profile, onJoin, loading }: {
  challenge: Challenge;
  participation?: ChallengeParticipation;
  profile: Profile;
  onJoin: (id: string) => void;
  loading: boolean;
}) {
  const hasAccess = canAccessTier(profile?.tier || 'free', challenge.tier_required);
  const isCompleted = ['completed', 'verified'].includes(participation?.status || '');
  const isEnrolled = participation?.status === 'enrolled';
  const tierColor = getTierColor(challenge.tier_required);

  return (
    <Link href={hasAccess ? `/challenges/${challenge.id}` : '/upgrade'}
      style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card" style={{
        padding: '20px', opacity: !hasAccess ? 0.6 : 1,
        border: isCompleted ? '1px solid #22c55e' : isEnrolled ? '1px solid var(--gold)' : '1px solid var(--border)',
        transition: 'border-color 0.15s',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              {challenge.badge_icon && <span style={{ fontSize: '24px' }}>{challenge.badge_icon}</span>}
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{challenge.title}</h3>
              {isCompleted && <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>✅ COMPLETED</span>}
              {isEnrolled && <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 700 }}>⚡ IN PROGRESS</span>}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px', lineHeight: 1.5 }}>
              {challenge.description.slice(0, 150)}{challenge.description.length > 150 ? '…' : ''}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>+{challenge.xp_reward} XP</span>
              {!hasAccess && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${tierColor}`, color: tierColor }}>
                  🔒 {getTierLabel(challenge.tier_required)}+
                </span>
              )}
              {challenge.end_date && !challenge.is_evergreen && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Ends {formatDate(challenge.end_date)}
                </span>
              )}
              {challenge.is_evergreen && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>♾️ Evergreen</span>}
            </div>
          </div>
          {!participation && hasAccess && (
            <button onClick={(e) => { e.preventDefault(); onJoin(challenge.id); }} disabled={loading}
              className="btn-gold" style={{ padding: '8px 20px', fontSize: '13px', flexShrink: 0, marginLeft: '16px' }}>
              {loading ? '…' : 'Join'}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
