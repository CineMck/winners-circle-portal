import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUsers } from '@/lib/push';

// POST /api/push/send — admin/moderator broadcast
// Body: { userIds?: string[], title, body, url? }
// If userIds is omitted, sends to every user with any registered device or web subscription.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userIds, title, body, url } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 });
    }

    // Resolve "all users" via the service-role key
    let targets: string[] = userIds || [];
    if (!userIds || userIds.length === 0) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: nativeUsers } = await admin
        .from('device_push_tokens').select('user_id');
      const { data: webUsers } = await admin
        .from('push_subscriptions').select('user_id');
      const set = new Set<string>();
      nativeUsers?.forEach((r) => set.add(r.user_id));
      webUsers?.forEach((r) => set.add(r.user_id));
      targets = Array.from(set);
    }

    const result = await sendPushToUsers(targets, { title, body, url });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
