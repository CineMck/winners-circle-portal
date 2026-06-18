import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// One auto-synced group conversation per paid tier. Ongoing membership is kept
// in sync by the sync_tier_group_membership() DB trigger; this endpoint creates
// the groups and does the initial population.
const TIER_GROUPS = [
  { tier: 'core', name: 'Core Members' },
  { tier: 'elite', name: 'Elevate Members' },
  { tier: 'founding', name: '1-1 Elite Members' },
];

export async function POST() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await auth.from('profiles').select('role').eq('id', user.id).single();
  if (!me || !['admin', 'moderator'].includes(me.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: { tier: string; group_id: string; members: number }[] = [];

  for (const g of TIER_GROUPS) {
    // Find or create this tier's group conversation.
    let groupId: string;
    const { data: existing } = await supabaseAdmin
      .from('conversations').select('id').eq('tier', g.tier).limit(1).maybeSingle();
    if (existing?.id) {
      groupId = existing.id;
    } else {
      const { data: created, error: convErr } = await supabaseAdmin
        .from('conversations')
        .insert({ is_group: true, name: g.name, tier: g.tier, created_by: user.id })
        .select('id').single();
      if (convErr || !created) {
        return NextResponse.json({ error: `Could not create ${g.name}: ${convErr?.message || 'unknown'}` }, { status: 500 });
      }
      groupId = created.id;
    }

    // Initial population — add all current members of this tier (idempotent).
    const { data: members } = await supabaseAdmin
      .from('profiles').select('id').eq('tier', g.tier);
    const rows = (members || []).map(m => ({ conversation_id: groupId, user_id: m.id }));
    if (rows.length > 0) {
      await supabaseAdmin
        .from('conversation_participants')
        .upsert(rows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
    }
    results.push({ tier: g.tier, group_id: groupId, members: rows.length });
  }

  return NextResponse.json({ success: true, groups: results });
}
