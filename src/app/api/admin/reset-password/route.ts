import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/reset-password
 * Body: { userId: string, newPassword: string }
 *
 * Admin-only — sets a new password for any user without needing
 * to know the current one. Uses Supabase service-role auth admin API.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the caller is signed in
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the caller is an admin (NOT moderator — passwords are sensitive)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const { userId, newPassword } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'newPassword required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    if (newPassword.length > 72) {
      // bcrypt max is 72 bytes
      return NextResponse.json(
        { error: 'Password must be 72 characters or fewer' },
        { status: 400 }
      );
    }

    // Use service-role client to call the Supabase Admin Auth API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('reset-password error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optional audit log — write to a table if you've got one. For now, just stderr.
    console.info(
      `[admin-action] ${user.email} reset password for user ${userId} at ${new Date().toISOString()}`
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('reset-password route error:', err);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
