import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/remove-post
 * Body: { postId: string, reason?: string }
 *
 * Admin/moderator action — soft-deletes a post regardless of authorship.
 * Bypasses RLS via service-role key. Also writes to moderation_log.
 *
 * DELETE /api/admin/remove-post?postId=...
 * Hard-deletes the post entirely. Admin only.
 */
async function authorize(req: NextRequest, requireAdmin = false) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 as const };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile) return { error: 'Forbidden', status: 403 as const };

  if (requireAdmin && profile.role !== 'admin') {
    return { error: 'Admin only', status: 403 as const };
  }
  if (!['admin', 'moderator'].includes(profile.role)) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { user, role: profile.role as string };
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { postId, reason } = await req.json();
    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    const supabaseAdmin = admin();
    const reasonText = (reason && String(reason).trim()) || 'Removed by moderator';

    const { error: updateErr } = await supabaseAdmin
      .from('posts')
      .update({
        is_removed: true,
        removed_reason: reasonText,
        removed_by: auth.user.id,
      })
      .eq('id', postId);

    if (updateErr) {
      console.error('remove-post update error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Best-effort audit log; don't fail the request if it errors
    await supabaseAdmin
      .from('moderation_log')
      .insert({
        moderator_id: auth.user.id,
        action: 'remove_post',
        target_type: 'post',
        target_id: postId,
        reason: reasonText,
      })
      .then(({ error }) => {
        if (error) console.warn('moderation_log insert failed:', error.message);
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('remove-post POST error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorize(req, /* requireAdmin */ true);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const postId = new URL(req.url).searchParams.get('postId');
    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    const supabaseAdmin = admin();
    const { error } = await supabaseAdmin.from('posts').delete().eq('id', postId);
    if (error) {
      console.error('remove-post hard-delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('remove-post DELETE error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
