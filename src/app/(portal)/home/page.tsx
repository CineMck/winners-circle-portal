import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Post, Profile } from '@/types';
import HomeFeed from './HomeFeed';

// The home announcement feed (admin/mod posts) and the leaderboard are identical
// for every member, so we cache them briefly and share the result across all
// requests instead of re-querying on every page load. Uses the service-role
// client so the cache key doesn't depend on the per-request session.
// New announcements appear within the revalidate window, and the client-side
// pull-to-refresh fetches live data on demand, so short staleness is fine.
const getHomeGlobals = unstable_cache(
  async (): Promise<{ posts: Post[]; topMembers: Partial<Profile>[] }> => {
    const admin = createAdminClient();

    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'moderator']);
    const adminIds = (adminProfiles || []).map((p) => p.id);

    let posts: Post[] = [];
    if (adminIds.length > 0) {
      const { data } = await admin
        .from('posts')
        .select('*, author:profiles!author_id(*), channel:channels(*), challenge:challenges(*)')
        .in('author_id', adminIds)
        .eq('is_removed', false)
        .is('channel_id', null)
        .is('challenge_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);
      posts = (data as Post[]) || [];
    }

    const { data: topMembers } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, tier, xp_points, username')
      .order('xp_points', { ascending: false })
      .limit(5);

    return { posts, topMembers: (topMembers as Partial<Profile>[]) || [] };
  },
  ['home-globals'],
  { revalidate: 30 }
);

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Per-user (not cached).
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Global, shared across all users (cached ~30s).
  const { posts, topMembers } = await getHomeGlobals();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';

  return (
    <HomeFeed
      profile={profile}
      initialPosts={posts}
      topMembers={topMembers}
      isAdmin={isAdmin}
    />
  );
}
