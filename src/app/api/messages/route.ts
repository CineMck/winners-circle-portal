import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

// POST /api/messages — find or create a conversation between two users
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipientId } = await req.json();
    if (!recipientId || recipientId === user.id) {
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    // Check if conversation already exists between these two users
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existing && existing.length > 0) {
      const myConvIds = existing.map(r => r.conversation_id);
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', recipientId)
        .in('conversation_id', myConvIds);

      if (shared && shared.length > 0) {
        return NextResponse.json({ conversationId: shared[0].conversation_id });
      }
    }

    // Create new conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (convErr || !conv) return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });

    // Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: recipientId },
    ]);

    return NextResponse.json({ conversationId: conv.id });
  } catch (err) {
    console.error('Messages route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
