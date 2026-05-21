import { createClient } from '@supabase/supabase-js';
import NewMembersView from './NewMembersView';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function NewMembersPage() {
  // Fetch all paid members, newest first
  const { data: members } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, tier, role, phone, birthday, industry, goals_12_months, goals_30_days, avatar_url, created_at')
    .in('tier', ['core', 'elite', 'founding'])
    .order('created_at', { ascending: false });

  // Get last_sign_in_at from auth.users
  const lastLoginMap: Record<string, string | null> = {};
  try {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
    const memberIds = new Set((members || []).map(m => m.id));
    for (const u of users) {
      if (memberIds.has(u.id)) {
        lastLoginMap[u.id] = u.last_sign_in_at || null;
      }
    }
  } catch { /* ignore */ }

  return <NewMembersView members={members || []} lastLoginMap={lastLoginMap} />;
}
