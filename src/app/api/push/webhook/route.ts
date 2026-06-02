import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUsers } from '@/lib/push';

/**
 * Supabase Database Webhook receiver.
 *
 * Configure in Supabase Dashboard → Database → Webhooks → Create:
 *   - On INSERT into `messages` → POST https://.../api/push/webhook?type=message
 *   - On INSERT into `comments` (or `post_replies`) → POST https://.../api/push/webhook?type=reply
 *
 * Include the header `x-webhook-secret: ${PUSH_WEBHOOK_SECRET}` (matches env var).
 *
 * Supabase posts a body of shape:
 *   { type: 'INSERT', table: 'messages', record: {...}, schema: 'public', old_record: null }
 */

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  // Auth: shared secret in header
  const secret = req.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const triggerType = new URL(req.url).searchParams.get('type');
  const body = await req.json().catch(() => null);
  if (!body || body.type !== 'INSERT' || !body.record) {
    return NextResponse.json({ ok: true, skipped: 'not an insert' });
  }

  const supabase = adminClient();
  const record = body.record;

  try {
    if (triggerType === 'message') {
      // record: { id, conversation_id, sender_id, content, created_at }
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', record.conversation_id);

      const recipients = (parts || [])
        .map((p) => p.user_id)
        .filter((id) => id !== record.sender_id);
      if (recipients.length === 0) return NextResponse.json({ ok: true });

      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', record.sender_id)
        .single();
      const senderName = sender?.full_name || sender?.username || 'A member';
      const preview = String(record.content || '').slice(0, 140);

      const result = await sendPushToUsers(recipients, {
        title: senderName,
        body: preview,
        url: `/messages/${record.conversation_id}`,
        data: { conversationId: String(record.conversation_id), kind: 'message' },
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (triggerType === 'reply') {
      // record assumed: { id, post_id, author_id, content }
      const { data: post } = await supabase
        .from('posts')
        .select('id, author_id, content')
        .eq('id', record.post_id)
        .single();
      if (!post || post.author_id === record.author_id) {
        return NextResponse.json({ ok: true, skipped: 'self-reply or missing post' });
      }

      const { data: author } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', record.author_id)
        .single();
      const authorName = author?.full_name || author?.username || 'A member';
      const preview = String(record.content || '').slice(0, 140);

      const result = await sendPushToUsers([post.author_id], {
        title: `${authorName} replied to your post`,
        body: preview,
        url: `/home?post=${post.id}`,
        data: { postId: String(post.id), kind: 'reply' },
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ ok: true, skipped: 'unknown type' });
  } catch (err) {
    console.error('push webhook error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
