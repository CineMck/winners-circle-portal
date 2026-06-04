import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { notFound, redirect } from 'next/navigation';
import ConversationView from './ConversationView';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verify this user is a participant (use admin client to bypass RLS)
  const { data: myRow } = await supabaseAdmin
    .from('conversation_participants')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!myRow) notFound();

  // Conversation meta (group name etc.)
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id, is_group, name')
    .eq('id', conversationId)
    .single();
  if (!conv) notFound();

  // Get all other participants (one for a 1:1, many for a group)
  const { data: otherRows } = await supabaseAdmin
    .from('conversation_participants')
    .select('user_id, profiles:profiles!user_id(id, full_name, avatar_url, tier, username)')
    .eq('conversation_id', conversationId)
    .neq('user_id', user.id);

  const otherUsers = (otherRows || []).map(r => r.profiles).filter(Boolean);

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  // Load initial messages
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100);

  // Profiles for senders who are no longer participants (removed from the
  // group) so their old messages still show a name and avatar.
  const participantIds = new Set([user.id, ...(otherRows || []).map(r => r.user_id)]);
  const formerSenderIds = [...new Set((messages || []).map(m => m.sender_id))].filter(id => !participantIds.has(id));
  let formerMembers: unknown[] = [];
  if (formerSenderIds.length > 0) {
    const { data: formerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, tier, username')
      .in('id', formerSenderIds);
    formerMembers = formerProfiles || [];
  }

  // Mark as read
  await supabaseAdmin
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);

  type ViewUser = { id: string; full_name: string; avatar_url?: string; tier: string; username: string };

  return (
    <ConversationView
      conversationId={conversationId}
      profile={profile}
      isGroup={conv.is_group || false}
      groupName={conv.name || null}
      isAdmin={['admin', 'moderator'].includes(profile?.role)}
      otherUsers={(otherUsers as unknown) as ViewUser[]}
      formerMembers={(formerMembers as unknown) as ViewUser[]}
      initialMessages={messages || []}
    />
  );
}
