'use client';
import { useState, useEffect } from 'react';
import { Challenge, ChallengeCheckin, ChallengeParticipation, Post, Profile, canAccessTier, getTierLabel } from '@/types';
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

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function calcStreak(checkins: ChallengeCheckin[]): number {
  if (!checkins.length) return 0;
  const dates = new Set(checkins.map(c => c.check_date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (dates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export default function ChallengeFeedView({ challenge, profile, participation, initialPosts, participantCount }: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [currentParticipation, setCurrentParticipation] = useState(participation);
  const [loading, setLoading] = useState(false);
  const [checkins, setCheckins] = useState<ChallengeCheckin[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<ChallengeCheckin | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSaved, setCheckinSaved] = useState(false);

  // Today's check-in form state
  const [completedTasks, setCompletedTasks] = useState<boolean[]>([]);
  const [metricValue, setMetricValue] = useState<string>('');
  const [checkinNotes, setCheckinNotes] = useState('');

  const supabase = createClient();
  const hasAccess = canAccessTier(profile?.tier || 'free', challenge.tier_required);
  const isEnrolled = !!currentParticipation;
  const isCompleted = ['completed', 'verified'].includes(currentParticipation?.status || '');
  const today = getTodayDate();

  const hasDailyTasks = Array.isArray(challenge.daily_tasks) && challenge.daily_tasks.length > 0;
  const hasMetric = !!challenge.target_metric;
  const hasDuration = !!challenge.duration_days;

  // Load check-ins for this user
  useEffect(() => {
    if (!isEnrolled) return;
    supabase
      .from('challenge_checkins')
      .select('*')
      .eq('challenge_id', challenge.id)
      .eq('user_id', profile.id)
      .order('check_date', { ascending: false })
      .then(({ data }) => {
        const list = (data as ChallengeCheckin[]) || [];
        setCheckins(list);
        const existing = list.find(c => c.check_date === today);
        if (existing) {
          setTodayCheckin(existing);
          setCompletedTasks(existing.tasks_completed || challenge.daily_tasks?.map(() => false) || []);
          setMetricValue(existing.metric_value !== null ? String(existing.metric_value) : '');
          setCheckinNotes(existing.notes || '');
        } else {
          setCompletedTasks(challenge.daily_tasks?.map(() => false) || []);
        }
      });
  }, [isEnrolled, challenge.id, profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    await supabase.from('profiles').update({ xp_points: (profile.xp_points || 0) + challenge.xp_reward }).eq('id', profile.id);
    setCurrentParticipation(prev => prev ? { ...prev, status: 'completed' } : prev);
    setLoading(false);
  }

  async function saveCheckin() {
    setCheckinLoading(true);
    const payload = {
      challenge_id: challenge.id,
      user_id: profile.id,
      check_date: today,
      tasks_completed: completedTasks,
      metric_value: metricValue !== '' ? Number(metricValue) : null,
      notes: checkinNotes.trim() || null,
    };

    if (todayCheckin) {
      const { data } = await supabase
        .from('challenge_checkins')
        .update(payload)
        .eq('id', todayCheckin.id)
        .select('*')
        .single();
      if (data) {
        setTodayCheckin(data as ChallengeCheckin);
        setCheckins(prev => prev.map(c => c.id === todayCheckin.id ? data as ChallengeCheckin : c));
      }
    } else {
      const { data } = await supabase
        .from('challenge_checkins')
        .insert(payload)
        .select('*')
        .single();
      if (data) {
        setTodayCheckin(data as ChallengeCheckin);
        setCheckins(prev => [data as ChallengeCheckin, ...prev]);
      }
    }
    setCheckinLoading(false);
    setCheckinSaved(true);
    setTimeout(() => setCheckinSaved(false), 2500);
  }

  // Progress calculations
  const totalCheckins = checkins.length;
  const progressPercent = hasDuration
    ? Math.min(100, Math.round((totalCheckins / challenge.duration_days!) * 100))
    : null;
  const streak = calcStreak(checkins);
  const todayDone = !!todayCheckin;
  const allTasksDone = hasDailyTasks && completedTasks.every(Boolean);

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
      {/* ─── Challenge header ─── */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
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
              {hasDuration && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--muted)' }}>📅 {challenge.duration_days} days</span>
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
            {isEnrolled && !isCompleted && hasDuration && progressPercent !== null && progressPercent >= (challenge.completion_threshold || 80) && (
              <button onClick={markComplete} disabled={loading} style={{
                background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px',
                padding: '10px 24px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
              }}>
                ✅ Claim Completion
              </button>
            )}
            {isEnrolled && !isCompleted && !hasDuration && (
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

      {/* ─── Progress Panel (enrolled only) ─── */}
      {isEnrolled && (hasDailyTasks || hasMetric || hasDuration) && (
        <div className="card" style={{ padding: '24px', marginBottom: '20px', border: '1px solid var(--gold)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--gold)' }}>📊 Your Progress</h2>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hasDuration ? 3 : 2}, 1fr)`, gap: '12px', marginBottom: '20px' }}>
            {hasDuration && (
              <div style={{ background: '#161616', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)' }}>{totalCheckins}/{challenge.duration_days}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Days Completed</div>
              </div>
            )}
            {!hasDuration && (
              <div style={{ background: '#161616', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)' }}>{totalCheckins}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Days Checked In</div>
              </div>
            )}
            <div style={{ background: '#161616', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: streak > 0 ? '#f97316' : 'var(--muted)' }}>
                {streak > 0 ? `🔥${streak}` : '0'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Day Streak</div>
            </div>
            {hasDuration && (
              <div style={{ background: '#161616', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: progressPercent! >= 100 ? '#22c55e' : 'var(--text)' }}>
                  {progressPercent}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Complete</div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {hasDuration && progressPercent !== null && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                <span>Progress</span>
                <span>{totalCheckins} of {challenge.duration_days} days · {challenge.completion_threshold || 80}% needed to complete</span>
              </div>
              <div style={{ height: '12px', background: '#222', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: progressPercent >= (challenge.completion_threshold || 80)
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, var(--gold), #e0a820)',
                  borderRadius: '100px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {/* Today's check-in */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                {todayDone ? '✅' : '☐'} Today&apos;s Check-In
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--muted)', marginLeft: '8px' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </h3>
              {checkinSaved && (
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>✓ Saved!</span>
              )}
            </div>

            {/* Daily tasks checklist */}
            {hasDailyTasks && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Daily Tasks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {challenge.daily_tasks.map((task, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', background: completedTasks[i] ? 'rgba(34,197,94,0.08)' : '#161616', border: `1px solid ${completedTasks[i] ? '#22c55e' : 'var(--border)'}`, borderRadius: '10px', transition: 'all 0.15s' }}>
                      <input
                        type="checkbox"
                        checked={completedTasks[i] || false}
                        onChange={e => setCompletedTasks(prev => {
                          const next = [...prev];
                          next[i] = e.target.checked;
                          return next;
                        })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--gold)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '14px', textDecoration: completedTasks[i] ? 'line-through' : 'none', color: completedTasks[i] ? 'var(--muted)' : 'var(--text)' }}>
                        {task}
                      </span>
                      {completedTasks[i] && <span style={{ marginLeft: 'auto', fontSize: '16px' }}>✅</span>}
                    </label>
                  ))}
                </div>
                {hasDailyTasks && (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                    {completedTasks.filter(Boolean).length} / {challenge.daily_tasks.length} tasks done
                  </div>
                )}
              </div>
            )}

            {/* Metric entry */}
            {hasMetric && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                  {challenge.target_metric}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    value={metricValue}
                    onChange={e => setMetricValue(e.target.value)}
                    placeholder="0"
                    min={0}
                    style={{ width: '120px', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '18px', fontWeight: 700, outline: 'none', textAlign: 'center' }}
                  />
                  {challenge.metric_unit && (
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{challenge.metric_unit}</span>
                  )}
                </div>
              </div>
            )}

            {/* Optional notes */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Notes (optional)
              </label>
              <textarea
                value={checkinNotes}
                onChange={e => setCheckinNotes(e.target.value)}
                placeholder="How did it go today? Any obstacles or wins…"
                rows={2}
                style={{ width: '100%', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <button
              onClick={saveCheckin}
              disabled={checkinLoading}
              style={{
                background: allTasksDone || (!hasDailyTasks && (metricValue !== '' || checkinNotes)) ? 'var(--gold)' : '#333',
                color: allTasksDone || (!hasDailyTasks && (metricValue !== '' || checkinNotes)) ? '#0a0a0a' : 'var(--muted)',
                border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer',
                fontWeight: 700, fontSize: '14px',
              }}
            >
              {checkinLoading ? 'Saving…' : todayDone ? '✏️ Update Check-In' : '✅ Submit Check-In'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Progress Feed ─── */}
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
