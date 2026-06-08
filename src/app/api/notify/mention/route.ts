import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUsers } from '@/lib/push';

export const dynamic = 'force-dynamic';

const GROUP_TOKENS = ['everyone', 'free', 'core', 'elite', 'founding', 're_promo'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/notify/mention
 * Creates mention notifications (+ push) for the people tagged in a comment/post.
 * Notifications are written with the service role so a user can't forge them.
 *
 * Body: {
 *   context: 'comment' | 'post',
 *   postId: string,
 *   userIds?: string[],   // individually tagged members
 *   groups?: string[],    // 'everyone' | tier — ADMIN/MOD ONLY
 *   preview?: string,     // snippet shown in the notification body
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: me } = await supabase
      .from('profiles').select('full_name, username, role').eq('id', user.id).single();
    if (!me) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const context: string = body?.context === 'post' ? 'post' : 'comment';
    const postId: string | undefined = body?.postId;
    const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds.filter((id: unknown) => typeof id === 'string' && UUID_RE.test(id)) : [];
    const groupsRaw: string[] = Array.isArray(body?.groups) ? body.groups.filter((g: unknown) => typeof g === 'string' && GROUP_TOKENS.includes(g)) : [];
    const preview = String(body?.preview || '').slice(0, 140);

    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

    // Group tags (@everyone / tiers) are admin/moderator only.
    const isStaff = ['admin', 'moderator'].includes(me.role);
    const groups = isStaff ? groupsRaw : [];

    const admin = createAdminClient();
    const recipients = new Set<string>(userIds);

    if (groups.length > 0) {
      if (groups.includes('everyone')) {
        const { data } = await admin.from('profiles').select('id');
        (data || []).forEach((p) => recipients.add(p.id));
      }
      const tiers = groups.filter((g) => g !== 'everyone');
      if (tiers.length > 0) {
        const { data } = await admin.from('profiles').select('id').in('tier', tiers);
        (data || []).forEach((p) => recipients.add(p.id));
      }
    }

    // Never notify the actor about their own mention.
    recipients.delete(user.id);
    const targets = [...recipients];
    if (targets.length === 0) return NextResponse.json({ ok: true, notified: 0 });

    const actorName = me.full_name || me.username || 'Someone';
    const title = `${actorName} mentioned you in a ${context}`;
    const link = `/home?post=${postId}`;

    // Create in-app notifications (service role bypasses the missing INSERT policy).
    const rows = targets.map((uid) => ({
      user_id: uid,
      actor_id: user.id,
      type: 'mention' as const,
      title,
      body: preview || 'You were tagged.',
      link,
    }));
    const { error: insErr } = await admin.from('notifications').insert(rows);
    if (insErr) console.error('mention notifications insert error:', insErr.message);

    // Fire push (best-effort).
    try {
      await sendPushToUsers(targets, {
        title,
        body: preview || 'You were tagged.',
        url: link,
        data: { kind: 'mention', postId: String(postId) },
      });
    } catch (e) {
      console.error('mention push error:', e);
    }

    return NextResponse.json({ ok: true, notified: targets.length });
  } catch (err) {
    console.error('notify/mention error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
