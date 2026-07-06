import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    // Verify the caller is an admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Role and tier changes are privileged — admin only (a moderator must not be
    // able to grant admin to themselves/others or hand out free paid tiers).
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, tier, role } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    const ALLOWED_ROLES = ['member', 'moderator', 'admin'];
    const ALLOWED_TIERS = ['free', 'base', 'core', 'elite', 'founding', 're_promo'];

    const updates: Record<string, string> = {};
    if (tier !== undefined) {
      if (!ALLOWED_TIERS.includes(tier)) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
      updates.tier = tier;
    }
    if (role !== undefined) {
      if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Use service role client — bypasses RLS
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('update-member error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('update-member route error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
