import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/push/register-token
 * Body: { token: string, platform: 'ios' | 'android' }
 *
 * Stores (or updates last_seen_at on) a native push token for the
 * currently signed-in user. Idempotent — safe to call on every app launch.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    const platform: string | undefined = body?.platform;

    if (!token || typeof token !== 'string' || token.length < 10) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    if (platform !== 'ios' && platform !== 'android') {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Upsert by unique token; bump last_seen_at and rebind user if changed.
    const { error } = await supabase
      .from('device_push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );

    if (error) {
      console.error('register-token upsert error:', error);
      return NextResponse.json({ error: 'Save failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('register-token error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
