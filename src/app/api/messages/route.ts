import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS for conversation + participant creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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

    // Check if a conversation already exists between these two users
    const { data: myRows } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myRows && myRows.length > 0) {
      const myConvIds = myRows.map(r => r.conversation_id);
      const { data: shared } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', recipientId)
        .in('conversation_id', myConvIds);

      if (shared && shared.length > 0) {
        return NextResponse.json({ conversationId: shared[0].conversation_id });
      }
    }

    // Create new conversation using admin client (bypasses RLS on INSERT+RETURNING)
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (convErr || !conv) {
      console.error('Conversation insert error:', convErr);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Add both participants
    const { error: partErr } = await supabaseAdmin
      .from('conversation_participants')
      .insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: recipientId },
      ]);

    if (partErr) {
      console.error('Participant insert error:', partErr);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    return NextResponse.json({ conversationId: conv.id });
  } catch (err) {
    console.error('Messages route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
