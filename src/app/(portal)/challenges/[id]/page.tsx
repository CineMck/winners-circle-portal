import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ChallengeFeedView from './ChallengeFeedView';

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: challenge } = await supabase.from('challenges').select('*').eq('id', id).single();
  if (!challenge) notFound();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: participation } = await supabase
    .from('challenge_participations')
    .select('*')
    .eq('challenge_id', id)
    .eq('user_id', user!.id)
    .single();

  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*)')
    .eq('challenge_id', id)
    .eq('is_removed', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: participantCount } = await supabase
    .from('challenge_participations')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', id);

  return (
    <ChallengeFeedView
      challenge={challenge}
      profile={profile}
      participation={participation}
      initialPosts={posts || []}
      participantCount={participantCount as unknown as number || 0}
    />
  );
}
