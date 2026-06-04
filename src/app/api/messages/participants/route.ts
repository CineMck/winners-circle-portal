import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS for participant management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST /api/messages/participants — add/remove members of a group DM.
 * Admins and moderators only.
 *
 * Body: { conversationId: string, add?: string[], remove?: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: me } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!me || !['admin', 'moderator'].includes(me.role)) {
      return NextResponse.json({ error: 'Only admins can manage group members' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const conversationId = String(body?.conversationId || '');
    const rawAdd: unknown[] = Array.isArray(body?.add) ? body.add : [];
    const rawRemove: unknown[] = Array.isArray(body?.remove) ? body.remove : [];
    const add = [...new Set(rawAdd.filter((id): id is string => typeof id === 'string' && id.length > 0))];
    const remove = [...new Set(rawRemove.filter((id): id is string => typeof id === 'string' && id.length > 0))];

    if (!conversationId || (add.length === 0 && remove.length === 0)) {
      return NextResponse.json({ error: 'Nothing to do' }, { status: 400 });
    }

    // Must be a group conversation
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id, is_group')
      .eq('id', conversationId)
      .single();
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if (!conv.is_group) {
      return NextResponse.json({ error: 'Members can only be managed on group messages' }, { status: 400 });
    }

    const { data: currentRows } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);
    const current = new Set((currentRows || []).map(r => r.user_id));

    const toAdd = add.filter(id => !current.has(id));
    const toRemove = remove.filter(id => current.has(id));

    // Keep the group a group: at least 2 people must remain
    const resulting = current.size + toAdd.length - toRemove.length;
    if (resulting < 2) {
      return NextResponse.json({ error: 'A group needs at least 2 members' }, { status: 400 });
    }
    if (resulting > 100) {
      return NextResponse.json({ error: 'Groups are limited to 100 members' }, { status: 400 });
    }

    if (toAdd.length > 0) {
      const { error } = await supabaseAdmin
        .from('conversation_participants')
        .insert(toAdd.map(id => ({ conversation_id: conversationId, user_id: id })));
      if (error) {
        console.error('Participant add error:', error);
        return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabaseAdmin
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .in('user_id', toRemove);
      if (error) {
        console.error('Participant remove error:', error);
        return NextResponse.json({ error: 'Failed to remove members' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, added: toAdd.length, removed: toRemove.length });
  } catch (err) {
    console.error('Participants route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
