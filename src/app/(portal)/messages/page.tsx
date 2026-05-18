import { createClient } from '@/lib/supabase/server';
import MessagesInbox from './MessagesInbox';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Get all conversations for this user with other participant info + last message
  const { data: participantRows } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user!.id);

  const convIds = (participantRows || []).map(r => r.conversation_id);

  let conversations: unknown[] = [];
  if (convIds.length > 0) {
    // Get other participants
    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profiles:profiles!user_id(id, full_name, avatar_url, tier, username)')
      .in('conversation_id', convIds)
      .neq('user_id', user!.id);

    // Get last message per conversation
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at, sender_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastMsgByConv: Record<string, { content: string; created_at: string; sender_id: string }> = {};
    (lastMessages || []).forEach(m => {
      if (!lastMsgByConv[m.conversation_id]) lastMsgByConv[m.conversation_id] = m;
    });

    const readAtByConv: Record<string, string | null> = {};
    (participantRows || []).forEach(r => { readAtByConv[r.conversation_id] = r.last_read_at; });

    conversations = (otherParticipants || []).map(op => ({
      conversationId: op.conversation_id,
      other: op.profiles,
      lastMessage: lastMsgByConv[op.conversation_id] || null,
      lastReadAt: readAtByConv[op.conversation_id] || null,
    })).sort((a: unknown, b: unknown) => {
      const ta = (a as { lastMessage: { created_at: string } | null }).lastMessage?.created_at || '';
      const tb = (b as { lastMessage: { created_at: string } | null }).lastMessage?.created_at || '';
      return tb.localeCompare(ta);
    });
  }

  // Get all members for new conversation search
  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, tier, username')
    .neq('id', user!.id)
    .order('full_name');

  return <MessagesInbox profile={profile} conversations={conversations as never} members={members || []} />;
}
