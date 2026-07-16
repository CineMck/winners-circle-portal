import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

// Service-role client — used only after the caller is verified as an admin.
export const ghostSupabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// The account whose likeness admins may ghost-author as (the community owner).
export const JOHN_EMAIL = process.env.AGENT_JOHN_EMAIL || 'john@wentworthre.com';

export type GhostAuthContext =
  | { ok: true; adminId: string }
  | { ok: false; status: number; error: string };

/**
 * Verify the current request comes from a signed-in admin.
 * Ghost authoring is admin-only (moderators excluded) because it publishes
 * under another person's identity.
 */
export async function requireAdminForGhost(): Promise<GhostAuthContext> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' };

  const { data: me } = await ghostSupabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!me || me.role !== 'admin') {
    return { ok: false, status: 403, error: 'Only admins can post as John.' };
  }
  return { ok: true, adminId: user.id };
}

/** Resolve John's profile id (the ghost-author target). */
export async function getJohnProfileId(): Promise<string | null> {
  const { data } = await ghostSupabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('email', JOHN_EMAIL)
    .single();
  return data?.id ?? null;
}
