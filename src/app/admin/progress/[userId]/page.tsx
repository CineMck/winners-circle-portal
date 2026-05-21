import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import AdminShell from '../../AdminShell';
import MemberProgressDetail from './MemberProgressDetail';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function MemberProgressPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminProfile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();
  if (!adminProfile || !['admin', 'moderator'].includes(adminProfile.role)) redirect('/home');

  // Target member
  const { data: member } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url, tier, username, email, bio, created_at')
    .eq('id', userId)
    .single();
  if (!member) notFound();

  // ── COURSES ──────────────────────────────────────────────────
  // All published courses with their lessons
  const { data: courses } = await supabaseAdmin
    .from('courses')
    .select('id, title, description, thumbnail_url, tier_required')
    .eq('is_published', true)
    .order('sort_order');

  const { data: allLessons } = await supabaseAdmin
    .from('course_lessons')
    .select('id, course_id, title, sort_order, duration_seconds')
    .eq('is_published', true)
    .order('sort_order');

  // This user's completed lessons
  const { data: completedLessons } = await supabaseAdmin
    .from('course_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', userId);

  const completedSet = new Set((completedLessons || []).map(p => p.lesson_id));
  const completedAtMap: Record<string, string> = {};
  (completedLessons || []).forEach(p => { completedAtMap[p.lesson_id] = p.completed_at; });

  const courseData = (courses || []).map(course => {
    const lessons = (allLessons || [])
      .filter(l => l.course_id === course.id)
      .map(l => ({
        ...l,
        completed: completedSet.has(l.id),
        completed_at: completedAtMap[l.id] || null,
      }));
    const completedCount = lessons.filter(l => l.completed).length;
    const pct = lessons.length > 0 ? Math.round(completedCount / lessons.length * 100) : 0;
    return { ...course, lessons, completedCount, totalLessons: lessons.length, pct };
  }).filter(c => c.totalLessons > 0);

  // ── CHALLENGES ────────────────────────────────────────────────
  const { data: participations } = await supabaseAdmin
    .from('challenge_participations')
    .select('id, challenge_id, status, enrolled_at, completed_at')
    .eq('user_id', userId);

  const challengeIds = (participations || []).map(p => p.challenge_id);

  let challengeData: unknown[] = [];
  if (challengeIds.length > 0) {
    const { data: challenges } = await supabaseAdmin
      .from('challenges')
      .select('id, title, description, target_metric, metric_unit, duration_days, daily_tasks, badge_icon, badge_name, xp_reward')
      .in('id', challengeIds);

    const { data: checkins } = await supabaseAdmin
      .from('challenge_checkins')
      .select('challenge_id, check_date, tasks_completed, metric_value, notes, created_at')
      .eq('user_id', userId)
      .order('check_date', { ascending: false });

    challengeData = (participations || []).map(p => {
      const challenge = (challenges || []).find(c => c.id === p.challenge_id);
      const myCheckins = (checkins || []).filter(c => c.challenge_id === p.challenge_id);
      // Calculate streak
      let streak = 0;
      const checkinDates = myCheckins.map(c => c.check_date).sort().reverse();
      if (checkinDates.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        let cursor = checkinDates[0] === today ? 0 : -1;
        if (cursor >= 0) {
          streak = 1;
          for (let i = 1; i < checkinDates.length; i++) {
            const prev = new Date(checkinDates[i - 1]);
            const curr = new Date(checkinDates[i]);
            const diff = (prev.getTime() - curr.getTime()) / 86400000;
            if (Math.round(diff) === 1) streak++;
            else break;
          }
        }
      }
      return {
        ...challenge,
        participationStatus: p.status,
        enrolledAt: p.enrolled_at,
        completedAt: p.completed_at,
        checkins: myCheckins,
        streak,
        totalCheckins: myCheckins.length,
      };
    });
  }

  return (
    <AdminShell profile={adminProfile}>
      <MemberProgressDetail
        member={member}
        courseData={courseData as never}
        challengeData={challengeData as never}
      />
    </AdminShell>
  );
}
