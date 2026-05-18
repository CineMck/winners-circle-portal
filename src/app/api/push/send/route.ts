import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

webpush.setVapidDetails(
  'mailto:' + (process.env.RESEND_FROM_EMAIL || 'hello@example.com'),
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// POST /api/push/send — send a push to one or all users
// Body: { userIds?: string[], title, body, url }
export async function POST(req: NextRequest) {
  try {
    // Verify caller is admin or internal (service-role)
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userIds, title, body, url = '/' } = await req.json();

    // Get subscriptions
    let query = supabaseAdmin.from('push_subscriptions').select('endpoint, p256dh, auth_key');
    if (userIds && userIds.length > 0) query = query.in('user_id', userIds);

    const { data: subs } = await query;
    if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;
    const stale: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            payload
          );
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) stale.push(sub.endpoint);
        }
      })
    );

    // Remove stale subscriptions
    if (stale.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', stale);
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
