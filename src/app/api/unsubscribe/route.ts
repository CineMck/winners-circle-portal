import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// POST /api/unsubscribe  Body: { token }
// Public, token-gated. Marks the matching registration as unsubscribed.
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: '' }));
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  }
  const { error, count } = await createAdminClient()
    .from('re_mastermind_registrations')
    .update({ unsubscribed: true }, { count: 'exact' })
    .eq('unsubscribe_token', token);
  if (error) return NextResponse.json({ error: 'Could not unsubscribe' }, { status: 500 });
  return NextResponse.json({ ok: true, updated: count || 0 });
}
