import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ConversationView from './ConversationView';

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verify this user is a participant
  const { data: myRow } = await supabase
    .from('conversation_participants')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user!.id)
    .single();

  if (!myRow) notFound();

  // Get other participant
  const { data: otherRow } = await supabase
    .from('conversation_participants')
    .select('user_id, profiles:profiles!user_id(id, full_name, avatar_url, tier, username)')
    .eq('conversation_id', conversationId)
    .neq('user_id', user!.id)
    .single();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Load initial messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100);

  // Mark as read
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user!.id);

  return (
    <ConversationView
      conversationId={conversationId}
      profile={profile}
      otherUser={(otherRow?.profiles as unknown) as { id: string; full_name: string; avatar_url?: string; tier: string; username: string }}
      initialMessages={messages || []}
    />
  );
}
