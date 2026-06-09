import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { reEmailShell, escapeHtml } from '@/lib/reMarketing';
import { sendSms, twilioConfigured } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint — emails RSVP'd registrants 24h before, 1h before, and at the
 * start of their call. Idempotent via per-reminder timestamp columns. Run every
 * ~15 minutes (Railway cron / Supabase scheduled function):
 *   POST /api/real-estate/reminders   Header: x-cron-secret: $CRON_SECRET
 */
type Kind = '24h' | '1h' | 'start';
const COL: Record<Kind, string> = {
  '24h': 'reminder_24h_sent_at',
  '1h': 'reminder_1h_sent_at',
  'start': 'reminder_start_sent_at',
};

function classify(hrsUntil: number): Kind | null {
  if (hrsUntil <= 24 && hrsUntil > 1.5) return '24h';
  if (hrsUntil <= 1.5 && hrsUntil > 0.2) return '1h';
  if (hrsUntil <= 0.2 && hrsUntil > -1) return 'start';
  return null;
}

function copy(kind: Kind, label: string) {
  if (kind === '24h') return { subject: `Reminder: your mastermind call is coming up`, heading: 'Your call is coming up', line: `This is a friendly reminder that the Elevate Real Estate Mastermind is happening soon:` };
  if (kind === '1h') return { subject: `Starting in 1 hour — Elevate RE Mastermind`, heading: 'Starting in about an hour', line: `Your mastermind call starts soon. Get ready and have one problem ready for John:` };
  return { subject: `We're live now — join the mastermind`, heading: `We're live now`, line: `The Elevate Real Estate Mastermind is starting. Join here:` };
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });

  const db = createAdminClient();
  const resend = new Resend(apiKey);
  const now = Date.now();
  const from = `John Wentworth <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

  const { data: sessions } = await db
    .from('re_call_sessions')
    .select('id, label, starts_at, zoom_url')
    .eq('is_active', true)
    .gte('starts_at', new Date(now - 60 * 60 * 1000).toISOString());

  let totalSent = 0;
  const summary: Record<string, number> = {};

  for (const s of sessions || []) {
    const hrs = (new Date(s.starts_at).getTime() - now) / 3_600_000;
    const kind = classify(hrs);
    if (!kind) continue;
    const col = COL[kind];

    const { data: regs } = await db
      .from('re_mastermind_registrations')
      .select('id, first_name, email, unsubscribe_token, phone, sms_consent, sms_opt_out')
      .eq('session_id', s.id)
      .eq('unsubscribed', false)
      .is(col, null);
    if (!regs || regs.length === 0) continue;

    const c = copy(kind, s.label);
    const zoom = s.zoom_url || '';

    const emails = regs.map((r) => ({
      from,
      to: r.email as string,
      subject: c.subject,
      html: reEmailShell(`
        <h2 style="margin:0 0 6px;color:#c9a84c;font-size:20px;">${c.heading}</h2>
        <p style="margin:0 0 14px;color:#bbb;font-size:14px;line-height:1.6;">Hi ${escapeHtml(r.first_name || 'there')} — ${c.line}</p>
        <table role="presentation" width="100%" style="background:#161616;border-radius:10px;margin-bottom:16px;">
          <tr><td style="padding:14px 16px;color:#888;font-size:13px;">When</td><td style="padding:14px 16px;color:#f5f5f5;font-size:14px;font-weight:600;">${escapeHtml(s.label)}</td></tr>
        </table>
        ${zoom ? `<div style="text-align:center;"><a href="${escapeHtml(zoom)}" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Join the Zoom call →</a></div>` : ''}
      `, { unsubscribeToken: r.unsubscribe_token as string }),
    }));

    // Resend batch limit is 100; chunk at 50 to be safe.
    for (let i = 0; i < emails.length; i += 50) {
      try { await resend.batch.send(emails.slice(i, i + 50)); } catch (e) { console.error('reminder batch failed:', e); }
    }

    // SMS reminder to opted-in registrants (best-effort).
    if (twilioConfigured()) {
      const smsText = `${c.heading}: ${s.label}.${zoom ? ` Join: ${zoom}` : ''} Reply STOP to opt out.`;
      for (const r of regs) {
        if (r.phone && r.sms_consent && !r.sms_opt_out) {
          try { await sendSms(r.phone as string, smsText); } catch (e) { console.error('reminder sms failed:', e); }
        }
      }
    }

    await db.from('re_mastermind_registrations')
      .update({ [col]: new Date().toISOString() })
      .in('id', regs.map((r) => r.id));

    totalSent += regs.length;
    summary[`${s.id}:${kind}`] = regs.length;
  }

  return NextResponse.json({ ok: true, sent: totalSent, summary });
}
