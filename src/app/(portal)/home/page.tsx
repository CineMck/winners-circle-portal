import { createClient } from '@/lib/supabase/server';
import HomeFeed from './HomeFeed';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Fetch admin/moderator user IDs — home feed is their broadcast channel
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'moderator']);
  const adminIds = (adminProfiles || []).map(p => p.id);

  // Only show posts authored by admins/mods, with no channel (home-only announcements)
  // or any channel (admins can tag a channel but post still surfaces on home)
  let posts = [];
  if (adminIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles!author_id(*), channel:channels(*), challenge:challenges(*)')
      .in('author_id', adminIds)
      .eq('is_removed', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30);
    posts = data || [];
  }

  const { data: topMembers } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, tier, xp_points, username')
    .order('xp_points', { ascending: false })
    .limit(5);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  return (
    <HomeFeed
      profile={profile}
      initialPosts={posts}
      topMembers={topMembers || []}
      isAdmin={isAdmin}
    />
  );
}
