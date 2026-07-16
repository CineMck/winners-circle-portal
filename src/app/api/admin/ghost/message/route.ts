import { NextRequest, NextResponse } from 'next/server';
import { requireAdminForGhost, getJohnProfileId, ghostSupabaseAdmin } from '@/lib/ghostAuthor';

export const dynamic = 'force-dynamic';

// POST /api/admin/ghost/message
// Admin-only. Sends a DM into an existing conversation under John's account.
// Body: { conversationId, content }
// Records ghost_sent_by = the real admin (audit trail).
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminForGhost();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const conversationId = String(body?.conversationId ?? '');
    const content = String(body?.content ?? '').trim();

    if (!conversationId) return NextResponse.json({ error: 'Missing conversation.' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'Message is empty.' }, { status: 400 });
    if (content.length > 5000) return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });

    const johnId = await getJohnProfileId();
    if (!johnId) {
      return NextResponse.json({ error: "John's account not found. Check AGENT_JOHN_EMAIL." }, { status: 500 });
    }

    // John must be a participant of the conversation. If he isn't (e.g. an
    // admin is ghosting into a member's existing 1:1 thread), add him first so
    // the message is visible and the thread behaves like a normal John DM.
    const { data: johnRow } = await ghostSupabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', johnId)
      .maybeSingle();

    if (!johnRow) {
      await ghostSupabaseAdmin
        .from('conversation_participants')
        .upsert(
          { conversation_id: conversationId, user_id: johnId },
          { onConflict: 'conversation_id,user_id', ignoreDuplicates: true }
        );
    }

    const { data, error } = await ghostSupabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: johnId,
        content,
        ghost_sent_by: auth.adminId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Ghost message error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await ghostSupabaseAdmin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({ message: data });
  } catch (err) {
    console.error('Ghost message route error:', err);
    return NextResponse.json({ error: 'Failed to send.' }, { status: 500 });
  }
}
