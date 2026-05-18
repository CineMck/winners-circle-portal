import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CoursesAdmin from './CoursesAdmin';

export default async function CoursesAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !['admin', 'moderator'].includes(profile.role)) redirect('/home');

  const { data: courses } = await supabase
    .from('courses')
    .select('*, lessons:course_lessons(id, title, sort_order, is_published, duration_seconds, video_url)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  return <CoursesAdmin courses={courses || []} adminId={user.id} />;
}
