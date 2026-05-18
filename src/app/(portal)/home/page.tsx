import { createClient } from '@/lib/supabase/server';
import HomeFeed from './HomeFeed';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*), channel:channels(*), challenge:challenges(*)')
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(30);

  const { data: topMembers } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, tier, xp_points, username')
    .order('xp_points', { ascending: false })
    .limit(5);

  return <HomeFeed profile={profile} initialPosts={posts || []} topMembers={topMembers || []} />;
}
