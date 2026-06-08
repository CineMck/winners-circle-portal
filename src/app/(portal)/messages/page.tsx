import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import MessagesInbox from './MessagesInbox';

// Auth-gated, reads cookies per request — never statically prerender.
// (The try/catch below would otherwise swallow Next's dynamic-render signal.)
export const dynamic = 'force-dynamic';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function MessagesPage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    // Use admin client to bypass RLS on conversation_participants
    const { data: participantRows } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);

    const convIds = (participantRows || []).map(r => r.conversation_id);

    let conversations: unknown[] = [];
    if (convIds.length > 0) {
      const { data: convMeta } = await supabaseAdmin
        .from('conversations')
        .select('id, is_group, name')
        .in('id', convIds);

      const { data: otherParticipants } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, user_id, profiles:profiles!user_id(id, full_name, avatar_url, tier, username)')
        .in('conversation_id', convIds)
        .neq('user_id', user.id);

      const { data: lastMessages } = await supabaseAdmin
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

      const metaByConv: Record<string, { is_group: boolean; name: string | null }> = {};
      (convMeta || []).forEach(c => { metaByConv[c.id] = { is_group: c.is_group, name: c.name }; });

      // Group the other-participant rows by conversation (groups have many).
      const othersByConv: Record<string, unknown[]> = {};
      (otherParticipants || []).forEach(op => {
        (othersByConv[op.conversation_id] ||= []).push(op.profiles);
      });

      conversations = convIds.map(id => ({
        conversationId: id,
        isGroup: metaByConv[id]?.is_group || false,
        name: metaByConv[id]?.name || null,
        others: othersByConv[id] || [],
        other: (othersByConv[id] || [])[0] || null,
        lastMessage: lastMsgByConv[id] || null,
        lastReadAt: readAtByConv[id] || null,
      })).sort((a: unknown, b: unknown) => {
        const ta = (a as { lastMessage: { created_at: string } | null }).lastMessage?.created_at || '';
        const tb = (b as { lastMessage: { created_at: string } | null }).lastMessage?.created_at || '';
        return tb.localeCompare(ta);
      });
    }

    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, tier, username')
      .neq('id', user.id)
      .order('full_name');

    const isAdmin = ['admin', 'moderator'].includes(profile?.role);

    return <MessagesInbox profile={profile} conversations={conversations as never} members={members || []} isAdmin={isAdmin} />;
  } catch (err) {
    console.error('MessagesPage error:', err);
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Messages could not load. Please try again.</p>
      </div>
    );
  }
}
