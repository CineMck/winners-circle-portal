import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/referrals/delete?id=...
 *
 * Removes a referral row. Only allowed if:
 *   - The caller is the referrer who created it, AND
 *   - The referral is still 'pending' (not yet converted/activated)
 *
 * Uses the service-role key for the actual delete to bypass any
 * client-side RLS gotchas, but enforces ownership server-side.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the referral exists, was created by this user, and is still pending
    const { data: ref, error: findErr } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_id, status, referred_user_id')
      .eq('id', id)
      .single();

    if (findErr || !ref) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }
    if (ref.referrer_id !== user.id) {
      return NextResponse.json({ error: 'Not your referral' }, { status: 403 });
    }
    if (ref.status !== 'pending' || ref.referred_user_id) {
      return NextResponse.json(
        { error: 'Cannot delete — this referral has already been activated' },
        { status: 400 }
      );
    }

    const { error: delErr } = await supabaseAdmin
      .from('referrals')
      .delete()
      .eq('id', id);

    if (delErr) {
      console.error('referrals delete error:', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('referrals/delete route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
