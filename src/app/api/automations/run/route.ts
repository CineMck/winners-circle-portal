import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { reEmailShell, escapeHtml } from '@/lib/reMarketing';
import { sendSms, twilioConfigured } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

/**
 * Automation engine — advances drip enrollments whose next step is due.
 * Run every ~15 min: POST /api/automations/run  Header: x-cron-secret: $CRON_SECRET
 *
 * Per enrollment: exit if the lead converted (now a paying member); otherwise
 * send the due step (email via Resend w/ unsubscribe footer, or SMS via Twilio
 * if the contact opted in), then schedule the next step.
 */
const PAID = ['core', 'elite', 'founding', 're_promo'];

interface Step { step_order: number; delay_minutes: number; channel: string; subject: string; body: string; }

function personalize(text: string, firstName?: string): string {
  return text.replace(/\{\{\s*first_name\s*\}\}/g, escapeHtml(firstName || 'there'));
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = createAdminClient();
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const from = `John Wentworth <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;
  const now = new Date();

  const { data: due } = await db
    .from('sequence_enrollments')
    .select('id, sequence_id, registration_id, email, phone, current_step')
    .eq('status', 'active')
    .lte('next_run_at', now.toISOString())
    .limit(100);

  if (!due || due.length === 0) return NextResponse.json({ ok: true, processed: 0 });

  // Cache steps per sequence.
  const stepsCache = new Map<string, Step[]>();
  async function steps(seqId: string): Promise<Step[]> {
    if (stepsCache.has(seqId)) return stepsCache.get(seqId)!;
    const { data } = await db.from('sequence_steps')
      .select('step_order, delay_minutes, channel, subject, body')
      .eq('sequence_id', seqId).eq('is_active', true).order('step_order', { ascending: true });
    const s = (data || []) as Step[];
    stepsCache.set(seqId, s);
    return s;
  }

  let sent = 0, exited = 0, completed = 0;

  for (const e of due) {
    const seqSteps = await steps(e.sequence_id);
    if (e.current_step >= seqSteps.length) {
      await db.from('sequence_enrollments').update({ status: 'completed' }).eq('id', e.id);
      completed++; continue;
    }

    // Exit on conversion (became a paying member).
    const { data: prof } = await db.from('profiles').select('tier').ilike('email', e.email).maybeSingle();
    if (prof && PAID.includes(prof.tier)) {
      await db.from('sequence_enrollments').update({ status: 'exited' }).eq('id', e.id);
      exited++; continue;
    }

    const { data: reg } = await db.from('re_mastermind_registrations')
      .select('first_name, unsubscribe_token, unsubscribed, sms_consent, sms_opt_out')
      .eq('id', e.registration_id).maybeSingle();

    const step = seqSteps[e.current_step];
    try {
      if (step.channel === 'sms') {
        if (e.phone && reg?.sms_consent && !reg?.sms_opt_out && twilioConfigured()) {
          await sendSms(e.phone, step.body.replace(/\{\{\s*first_name\s*\}\}/g, reg?.first_name || 'there'));
          sent++;
        }
      } else {
        if (resend && !reg?.unsubscribed) {
          await resend.emails.send({
            from, to: e.email, subject: step.subject || 'The Winners Circle',
            html: reEmailShell(personalize(step.body, reg?.first_name), { unsubscribeToken: reg?.unsubscribe_token }),
          });
          sent++;
        }
      }
    } catch (err) {
      console.error('automation step send failed:', err);
    }

    // Advance.
    const next = e.current_step + 1;
    if (next >= seqSteps.length) {
      await db.from('sequence_enrollments').update({ status: 'completed', current_step: next, last_sent_at: now.toISOString() }).eq('id', e.id);
      completed++;
    } else {
      await db.from('sequence_enrollments').update({
        current_step: next,
        last_sent_at: now.toISOString(),
        next_run_at: new Date(now.getTime() + seqSteps[next].delay_minutes * 60_000).toISOString(),
      }).eq('id', e.id);
    }
  }

  return NextResponse.json({ ok: true, processed: due.length, sent, exited, completed });
}
