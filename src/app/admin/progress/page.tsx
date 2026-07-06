import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import AdminShell from '../AdminShell';
import MemberProgressOverview from './MemberProgressOverview';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: adminProfile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();
  if (!adminProfile || !['admin', 'moderator'].includes(adminProfile.role)) redirect('/home');

  // All members
  const { data: members } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url, tier, username, email')
    .order('full_name');

  // Course progress: lesson completions per user + lesson's course info
  const { data: courseProgress } = await supabaseAdmin
    .from('course_progress')
    .select('user_id, lesson_id, completed_at, course_lessons(course_id, courses(id, title))');

  // Total lessons per course
  const { data: allLessons } = await supabaseAdmin
    .from('course_lessons')
    .select('id, course_id')
    .eq('is_published', true);

  // Challenge participations per user
  const { data: participations } = await supabaseAdmin
    .from('challenge_participations')
    .select('user_id, challenge_id, status, enrolled_at, completed_at');

  // Check-ins per user
  const { data: checkins } = await supabaseAdmin
    .from('challenge_checkins')
    .select('user_id, check_date, challenge_id');

  // Community activity (posts + comments) from the last 90 days — feeds both
  // "Last Active" and the 30-day activity column.
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const { data: recentPosts } = await supabaseAdmin
    .from('posts')
    .select('author_id, created_at')
    .gte('created_at', since);
  const { data: recentComments } = await supabaseAdmin
    .from('comments')
    .select('author_id, created_at')
    .gte('created_at', since);

  // Last sign-in per user from Supabase Auth — the truest "last active",
  // even for members who never post or take courses.
  const lastSignIn: Record<string, string> = {};
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) if (u.last_sign_in_at) lastSignIn[u.id] = u.last_sign_in_at;
      if (data.users.length < 1000) break;
      page++;
    }
  } catch { /* proceed without sign-in data */ }

  const cutoff30 = Date.now() - 30 * 86400000;

  // Build summary per member
  const lessonsByCourse: Record<string, number> = {};
  (allLessons || []).forEach(l => {
    lessonsByCourse[l.course_id] = (lessonsByCourse[l.course_id] || 0) + 1;
  });

  const memberStats = (members || []).map(m => {
    // Courses
    const myProgress = (courseProgress || []).filter(p => p.user_id === m.id);
    const courseMap: Record<string, { title: string; completed: number; total: number }> = {};
    myProgress.forEach(p => {
      const lesson = p.course_lessons as unknown as { course_id: string; courses: { id: string; title: string } };
      if (!lesson?.courses) return;
      const cid = lesson.courses.id;
      if (!courseMap[cid]) {
        courseMap[cid] = { title: lesson.courses.title, completed: 0, total: lessonsByCourse[cid] || 0 };
      }
      courseMap[cid].completed++;
    });
    const coursesStarted = Object.keys(courseMap).length;
    const totalLessonsCompleted = myProgress.length;
    const avgPct = coursesStarted > 0
      ? Math.round(Object.values(courseMap).reduce((sum, c) => sum + (c.total > 0 ? c.completed / c.total : 0), 0) / coursesStarted * 100)
      : 0;

    // Challenges
    const myParticipations = (participations || []).filter(p => p.user_id === m.id);
    const myCheckins = (checkins || []).filter(c => c.user_id === m.id);
    const completedChallenges = myParticipations.filter(p => p.status === 'completed').length;

    const myPosts = (recentPosts || []).filter(p => p.author_id === m.id);
    const myComments = (recentComments || []).filter(c => c.author_id === m.id);

    // Last activity — most recent of: sign-in, post, comment, lesson, check-in
    const stamps = [
      lastSignIn[m.id],
      ...myPosts.map(p => p.created_at),
      ...myComments.map(c => c.created_at),
      ...myProgress.map(p => p.completed_at),
      ...myCheckins.map(c => c.check_date),
    ]
      .filter(Boolean)
      .map(d => new Date(d as string).getTime())
      .filter(t => !Number.isNaN(t))
      .sort((a, b) => b - a);
    const lastActive = stamps[0] ? new Date(stamps[0]).toISOString() : null;

    // Activity over the last 30 days
    const in30 = (d?: string | null) => !!d && new Date(d).getTime() >= cutoff30;
    const posts30 = myPosts.filter(p => in30(p.created_at)).length;
    const comments30 = myComments.filter(c => in30(c.created_at)).length;
    const checkins30 = myCheckins.filter(c => in30(c.check_date)).length;
    const lessons30 = myProgress.filter(p => in30(p.completed_at)).length;

    return {
      posts30,
      comments30,
      checkins30,
      lessons30,
      activity30: posts30 + comments30 + checkins30 + lessons30,
      id: m.id,
      full_name: m.full_name,
      avatar_url: m.avatar_url,
      tier: m.tier,
      username: m.username,
      email: m.email,
      coursesStarted,
      totalLessonsCompleted,
      avgCourseCompletion: avgPct,
      challengesJoined: myParticipations.length,
      challengesCompleted: completedChallenges,
      totalCheckins: myCheckins.length,
      lastActive,
    };
  });

  return (
    <AdminShell profile={adminProfile}>
      <MemberProgressOverview members={memberStats} />
    </AdminShell>
  );
}
