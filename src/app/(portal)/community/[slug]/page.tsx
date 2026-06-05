import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { canAccessGroup, canAccessTier, AccessGroup, MemberTier, ACCESS_GROUP_LABELS } from '@/types';
import ChannelView from './ChannelView';
import Link from 'next/link';

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: channel },
    { data: profile },
    { data: allChannels },
  ] = await Promise.all([
    supabase.from('channels').select('*').eq('slug', slug).single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('channels').select('*').eq('is_archived', false).order('sort_order'),
  ]);

  if (!channel) notFound();

  // Tier-based access check. Prefer new access_group; fall back to legacy tier_required.
  const userTier: MemberTier = (profile?.tier as MemberTier) || 'free';
  const channelAccessGroup = (channel as { access_group?: AccessGroup }).access_group;
  const hasAccess = channelAccessGroup
    ? canAccessGroup(userTier, channelAccessGroup)
    : canAccessTier(userTier, channel.tier_required);

  if (!hasAccess) {
    const requiredLabel = channelAccessGroup
      ? ACCESS_GROUP_LABELS[channelAccessGroup]
      : `${channel.tier_required} and above`;
    return (
      <div style={{ padding: '64px 24px', maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
          #{channel.name} is members-only
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 4 }}>
          This channel is for <strong style={{ color: 'var(--gold)' }}>{requiredLabel}</strong>.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 28 }}>
          Upgrade your membership to join the conversation.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/upgrade"
            className="btn-gold"
            style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
          >
            Upgrade Membership
          </Link>
          <Link
            href="/community"
            style={{ padding: '12px 24px', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--muted)', fontSize: 14, textDecoration: 'none' }}
          >
            ← Back to Community
          </Link>
        </div>
      </div>
    );
  }

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
