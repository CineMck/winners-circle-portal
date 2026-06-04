import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS for conversation + participant creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/messages — find or create a conversation
//   1:1   — body: { recipientId: string }            (any member)
//   group — body: { recipientIds: string[], name }   (admins/moderators only)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // ── Group DM creation (admin/moderator only) ──
    if (Array.isArray(body.recipientIds)) {
      const { data: me } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!me || !['admin', 'moderator'].includes(me.role)) {
        return NextResponse.json({ error: 'Only admins can create group messages' }, { status: 403 });
      }

      const recipientIds: string[] = [...new Set(
        (body.recipientIds as string[]).filter(id => typeof id === 'string' && id && id !== user.id)
      )];
      const name = String(body.name || '').trim().slice(0, 80);

      if (recipientIds.length < 2) {
        return NextResponse.json({ error: 'Pick at least 2 members for a group' }, { status: 400 });
      }
      if (recipientIds.length > 100) {
        return NextResponse.json({ error: 'Groups are limited to 100 members' }, { status: 400 });
      }
      if (!name) {
        return NextResponse.json({ error: 'Please give the group a name' }, { status: 400 });
      }

      const { data: conv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .insert({ is_group: true, name, created_by: user.id })
        .select('id')
        .single();
      if (convErr || !conv) {
        console.error('Group conversation insert error:', convErr);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
      }

      const rows = [user.id, ...recipientIds].map(id => ({ conversation_id: conv.id, user_id: id }));
      const { error: partErr } = await supabaseAdmin.from('conversation_participants').insert(rows);
      if (partErr) {
        console.error('Group participant insert error:', partErr);
        return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
      }

      return NextResponse.json({ conversationId: conv.id });
    }

    // ── 1:1 conversation (existing behavior) ──
    const { recipientId } = body;
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
        // Only reuse a 1:1 conversation — a shared *group* doesn't count.
        const { data: oneOnOne } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .in('id', shared.map(s => s.conversation_id))
          .eq('is_group', false)
          .limit(1);
        if (oneOnOne && oneOnOne.length > 0) {
          return NextResponse.json({ conversationId: oneOnOne[0].id });
        }
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
