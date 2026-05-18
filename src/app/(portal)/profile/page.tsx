import { createClient } from '@/lib/supabase/server';
import ProfilePage from './ProfilePage';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: completedChallenges } = await supabase
    .from('challenge_participations')
    .select('*, challenge:challenges(*)')
    .eq('user_id', user!.id)
    .in('status', ['completed', 'verified'])
    .order('completed_at', { ascending: false });

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('*, channel:channels(*), challenge:challenges(*)')
    .eq('author_id', user!.id)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(10);

  return <ProfilePage profile={profile} completedChallenges={completedChallenges || []} recentPosts={recentPosts || []} />;
}
