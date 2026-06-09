import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return !!p && ['admin', 'moderator'].includes(p.role);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = createAdminClient();
  const { data: sequences } = await db.from('email_sequences').select('*').order('created_at', { ascending: true });
  const out = [];
  for (const seq of sequences || []) {
    const { data: steps } = await db.from('sequence_steps').select('*').eq('sequence_id', seq.id).order('step_order', { ascending: true });
    const counts: Record<string, number> = {};
    for (const st of ['active', 'completed', 'exited']) {
      const { count } = await db.from('sequence_enrollments').select('*', { count: 'exact', head: true }).eq('sequence_id', seq.id).eq('status', st);
      counts[st] = count || 0;
    }
    out.push({ ...seq, steps: steps || [], counts });
  }
  return NextResponse.json({ sequences: out });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = createAdminClient();
  const b = await req.json().catch(() => ({}));

  switch (b.action) {
    case 'toggleSequence': {
      if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const { error } = await db.from('email_sequences').update({ is_active: !!b.is_active }).eq('id', b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case 'updateStep': {
      if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const u: Record<string, unknown> = {};
      for (const k of ['step_order', 'delay_minutes', 'channel', 'subject', 'body', 'is_active']) {
        if (b[k] !== undefined) u[k] = b[k];
      }
      const { error } = await db.from('sequence_steps').update(u).eq('id', b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case 'addStep': {
      if (!b.sequence_id) return NextResponse.json({ error: 'sequence_id required' }, { status: 400 });
      const { data: last } = await db.from('sequence_steps').select('step_order').eq('sequence_id', b.sequence_id).order('step_order', { ascending: false }).limit(1).maybeSingle();
      const order = (last?.step_order || 0) + 1;
      const { data, error } = await db.from('sequence_steps').insert({
        sequence_id: b.sequence_id, step_order: order, delay_minutes: 1440, channel: 'email', subject: '', body: '',
      }).select('*').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ step: data });
    }
    case 'deleteStep': {
      if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const { error } = await db.from('sequence_steps').delete().eq('id', b.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
