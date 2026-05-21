import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ChannelView from './ChannelView';

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [
    { data: channel },
    { data: profile },
    { data: allChannels },
  ] = await Promise.all([
    supabase.from('channels').select('*').eq('slug', slug).single(),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('channels').select('*').eq('is_archived', false).order('sort_order'),
  ]);

  if (!channel) notFound();

  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles!author_id(*), channel:channels(*)')
    .eq('channel_id', channel.id)
    .eq('is_removed', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <ChannelView
      channel={channel}
      profile={profile}
      initialPosts={posts || []}
      allChannels={allChannels || []}
    />
  );
}
