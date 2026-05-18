import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import MemberProfileView from './MemberProfileView';

export default async function MemberProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // If viewing own profile, redirect to /profile
  const { data: currentProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
  if (currentProfile?.username === username) redirect('/profile');

  // Fetch the member being viewed
  const { data: member } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, bio, tier, xp_points, created_at')
    .eq('username', username)
    .single();

  if (!member) notFound();

  // Fetch their recent posts
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, content, created_at, channel:channels(name, slug)')
    .eq('author_id', member.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch completed challenges
  const { data: completedChallenges } = await supabase
    .from('challenge_participations')
    .select('id, completed_at, challenge:challenges(title, badge_icon, xp_reward)')
    .eq('user_id', member.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  return (
    <MemberProfileView
      currentUserId={user.id}
      member={member}
      recentPosts={recentPosts || []}
      completedChallenges={completedChallenges || []}
    />
  );
}
