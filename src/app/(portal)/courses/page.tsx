import { createClient } from '@/lib/supabase/server';
import CoursesPage from './CoursesPage';

export default async function Courses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: courses } = await supabase
    .from('courses')
    .select('*, lessons:course_lessons(id, is_published)')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  // Fetch completed lesson IDs for this user
  const { data: progress } = await supabase
    .from('course_progress')
    .select('lesson_id')
    .eq('user_id', user!.id);

  const completedLessonIds = new Set((progress || []).map(p => p.lesson_id));

  return <CoursesPage profile={profile} courses={courses || []} completedLessonIds={[...completedLessonIds]} />;
}
