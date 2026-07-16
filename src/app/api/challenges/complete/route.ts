import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/challenges/complete  Body: { challengeId }
// Server-authoritative challenge completion. Marks the caller's own
// participation completed and awards XP exactly once. XP is awarded here (not
// client-side) so members can't inflate their leaderboard score — pairs with
// the DB trigger that blocks client writes to profiles.xp_points.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { challengeId } = await req.json().catch(() => ({}));
    if (!challengeId || typeof challengeId !== 'string') {
      return NextResponse.json({ error: 'challengeId required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // The caller must already be enrolled in this challenge.
    const { data: participation } = await admin
      .from('challenge_participations')
      .select('id, status')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();
    if (!participation) {
      return NextResponse.json({ error: 'You are not enrolled in this challenge.' }, { status: 400 });
    }

    // Idempotent: if already completed/verified, don't award XP again.
    if (participation.status === 'completed' || participation.status === 'verified') {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    const { data: challenge } = await admin
      .from('challenges').select('xp_reward').eq('id', challengeId).single();
    const xpReward = Number(challenge?.xp_reward || 0);

    await admin
      .from('challenge_participations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', participation.id);

    if (xpReward > 0) {
      const { data: prof } = await admin
        .from('profiles').select('xp_points').eq('id', user.id).single();
      const newXp = Number(prof?.xp_points || 0) + xpReward;
      await admin.from('profiles').update({ xp_points: newXp }).eq('id', user.id);
    }

    return NextResponse.json({ ok: true, xpAwarded: xpReward });
  } catch (err) {
    console.error('challenges/complete error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
