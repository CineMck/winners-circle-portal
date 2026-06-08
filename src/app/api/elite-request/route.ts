import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';

/**
 * POST /api/elite-request
 *
 * Triggered when a member clicks "Request Access" on the 1-1 Elite tier.
 * Finds Christian Wentworth's user account, finds or creates a 1:1
 * conversation between the requester and Christian, and inserts a
 * message describing the request. The existing Supabase webhook will
 * then auto-trigger a push notification to Christian.
 *
 * Christian is looked up by env var (preferred) or falls back to name search.
 *   ELITE_REQUEST_RECIPIENT_EMAIL — Christian Wentworth's account email
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function findRecipient(supabaseAdmin: ReturnType<typeof admin>): Promise<string | null> {
  // Preferred: explicit env var
  const email = process.env.ELITE_REQUEST_RECIPIENT_EMAIL;
  if (email) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // Fallback: search by full name
  const { data: byName } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', '%Christian Wentworth%')
    .order('created_at', { ascending: true })
    .limit(1);
  if (byName && byName[0]?.id) return byName[0].id;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`elite:${user.id}`, 5, 60 * 60_000); // 5 per hour
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, tier')
      .eq('id', user.id)
      .single();
    if (!senderProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const supabaseAdmin = admin();
    const recipientId = await findRecipient(supabaseAdmin);
    if (!recipientId) {
      return NextResponse.json(
        { error: 'Could not locate Christian Wentworth — set ELITE_REQUEST_RECIPIENT_EMAIL on the server.' },
        { status: 500 }
      );
    }
    if (recipientId === senderProfile.id) {
      return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 });
    }

    // Find existing 1:1 conversation (where ONLY these two are participants)
    let conversationId: string | null = null;
    const { data: senderParts } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', senderProfile.id);

    if (senderParts && senderParts.length > 0) {
      const senderConvIds = senderParts.map((p) => p.conversation_id);
      const { data: shared } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', recipientId)
        .in('conversation_id', senderConvIds);
      if (shared && shared.length > 0) conversationId = shared[0].conversation_id;
    }

    // Create new conversation if needed
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .insert({})
        .select('id')
        .single();
      if (convErr || !conv) {
        console.error('elite-request conv insert error:', convErr);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }
      conversationId = conv.id;
      const { error: partErr } = await supabaseAdmin
        .from('conversation_participants')
        .insert([
          { conversation_id: conversationId, user_id: senderProfile.id },
          { conversation_id: conversationId, user_id: recipientId },
        ]);
      if (partErr) {
        console.error('elite-request participant insert error:', partErr);
        return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
      }
    }

    // Compose the request message
    const requesterName = senderProfile.full_name || senderProfile.email || 'A member';
    const messageContent =
      `Hi Christian — I'd like to request access to the 1-1 Elite Membership. ` +
      `I'm ready to take my growth to the next level and would love to learn more about ` +
      `the program. Could we set up a time to chat?\n\n` +
      `— ${requesterName}`;

    const { error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderProfile.id,
        content: messageContent,
      });
    if (msgErr) {
      console.error('elite-request message insert error:', msgErr);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      conversationId,
      message: 'Your request has been sent. Christian will be in touch shortly.',
    });
  } catch (err) {
    console.error('elite-request route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
