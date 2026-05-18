import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CourseView from './CourseView';

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: course } = await supabase
    .from('courses')
    .select('*, lessons:course_lessons(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!course) notFound();

  // Tier gate
  const TIER_ORDER: Record<string, number> = { free: 0, core: 1, elite: 2, founding: 3 };
  const userTier = TIER_ORDER[profile?.tier || 'free'] ?? 0;
  const requiredTier = TIER_ORDER[course.tier_required] ?? 0;
  if (userTier < requiredTier) {
    // Return upgrade prompt handled in CourseView via accessible=false
  }

  const { data: progress } = await supabase
    .from('course_progress')
    .select('lesson_id')
    .eq('user_id', user!.id);

  const completedLessonIds = (progress || []).map(p => p.lesson_id);
  const accessible = userTier >= requiredTier;

  return (
    <CourseView
      course={course}
      profile={profile}
      completedLessonIds={completedLessonIds}
      accessible={accessible}
    />
  );
}
