import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { sendSms, toE164, twilioConfigured } from '@/lib/twilio';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const dynamic = 'force-dynamic';

// Audiences for one-way SMS blasts. Members must have sms_consent = true and
// sms_opt_out = false (TCPA). 're' is the Real Estate RSVP marketing list.
const MEMBER_AUDIENCES = ['all', 'base', 'core', 'elite', 'founding'] as const;
type Audience = (typeof MEMBER_AUDIENCES)[number] | 're';

type Recipient = { phone: string; firstName: string };

async function requireStaff() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!me || !['admin', 'moderator'].includes(me.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user };
}

async function resolveRecipients(audience: Audience): Promise<Recipient[]> {
  const out: Recipient[] = [];
  if (audience === 're') {
    const { data } = await supabaseAdmin
      .from('re_mastermind_registrations')
      .select('phone, first_name')
      .eq('sms_consent', true)
      .eq('sms_opt_out', false)
      .not('phone', 'is', null);
    for (const r of data || []) {
      if (r.phone) out.push({ phone: r.phone as string, firstName: (r.first_name as string) || '' });
    }
  } else {
    let query = supabaseAdmin
      .from('profiles')
      .select('phone, full_name')
      .eq('sms_consent', true)
      .eq('sms_opt_out', false)
      .not('phone', 'is', null);
    if (audience !== 'all') query = query.eq('tier', audience);
    const { data } = await query;
    for (const p of data || []) {
      if (p.phone) out.push({ phone: p.phone as string, firstName: String(p.full_name || '').split(' ')[0] });
    }
  }
  // Dedupe on normalized E.164 (a member could also be on the RE list, or
  // share a phone across rows). Invalid numbers are dropped here too.
  const seen = new Map<string, Recipient>();
  for (const r of out) {
    const e164 = toE164(r.phone);
    if (e164 && !seen.has(e164)) seen.set(e164, { phone: e164, firstName: r.firstName });
  }
  return [...seen.values()];
}

// GET /api/admin/sms — recipient counts per audience + recent broadcast log
export async function GET() {
  const gate = await requireStaff();
  if ('error' in gate) return gate.error;

  const counts: Record<string, number> = {};
  for (const a of [...MEMBER_AUDIENCES, 're'] as Audience[]) {
    counts[a] = (await resolveRecipients(a)).length;
  }

  const { data: recent } = await supabaseAdmin
    .from('sms_broadcasts')
    .select('id, message, audience, recipient_count, sent_count, failed_count, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    configured: twilioConfigured(),
    counts,
    recent: recent || [],
  });
}

// POST /api/admin/sms — send a one-way broadcast
// Body: { message: string, audience: Audience }
export async function POST(req: NextRequest) {
  const gate = await requireStaff();
  if ('error' in gate) return gate.error;

  if (!twilioConfigured()) {
    return NextResponse.json(
      { error: 'Twilio is not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID on Railway.' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const message = String(body.message || '').trim();
  const audience = body.audience as Audience;

  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  if (message.length > 640) {
    return NextResponse.json({ error: 'Keep messages under 640 characters (4 SMS segments).' }, { status: 400 });
  }
  if (![...MEMBER_AUDIENCES, 're'].includes(audience)) {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
  }

  const recipients = await resolveRecipients(audience);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No consented recipients with a phone number for that audience.' }, { status: 400 });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const r of recipients) {
    const text = message.replace(/\{\{\s*first_name\s*\}\}/g, r.firstName || 'there');
    const res = await sendSms(r.phone, text);
    if (res.ok) sent++;
    else {
      failed++;
      if (errors.length < 5 && res.error) errors.push(res.error);
    }
  }

  await supabaseAdmin.from('sms_broadcasts').insert({
    message,
    audience,
    recipient_count: recipients.length,
    sent_count: sent,
    failed_count: failed,
    created_by: gate.user.id,
  });

  return NextResponse.json({ success: true, recipients: recipients.length, sent, failed, errors });
}
