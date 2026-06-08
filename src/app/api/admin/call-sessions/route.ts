import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || !['admin', 'moderator'].includes(p.role)) return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await createAdminClient()
    .from('re_call_sessions').select('*').order('starts_at', { ascending: false });
  return NextResponse.json({ sessions: data || [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.label || !b.starts_at) return NextResponse.json({ error: 'Label and start time are required' }, { status: 400 });
  const { data, error } = await createAdminClient().from('re_call_sessions').insert({
    label: String(b.label).slice(0, 200),
    starts_at: new Date(b.starts_at).toISOString(),
    zoom_url: b.zoom_url ? String(b.zoom_url).slice(0, 500) : null,
    is_active: b.is_active !== false,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updates: Record<string, unknown> = {};
  if (b.label !== undefined) updates.label = String(b.label).slice(0, 200);
  if (b.starts_at !== undefined) updates.starts_at = new Date(b.starts_at).toISOString();
  if (b.zoom_url !== undefined) updates.zoom_url = b.zoom_url ? String(b.zoom_url).slice(0, 500) : null;
  if (b.is_active !== undefined) updates.is_active = !!b.is_active;
  const { data, error } = await createAdminClient().from('re_call_sessions').update(updates).eq('id', b.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await createAdminClient().from('re_call_sessions').delete().eq('id', b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
