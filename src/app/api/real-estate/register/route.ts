import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rateLimit';
import { reEmailShell, formatCallTime, escapeHtml } from '@/lib/reMarketing';
import { buildIcs } from '@/lib/ics';

/**
 * POST /api/real-estate/register
 * Body: { firstName, lastName, email, phone, brokerage, sessionId, problem? }
 *
 * Saves the RSVP, emails the registrant a confirmation with the Zoom link + a
 * calendar (.ics) invite, and notifies the host. Sessions are managed in the
 * re_call_sessions table (admin → Call Sessions).
 */

const NOTIFY_EMAIL =
  process.env.RE_NOTIFY_EMAIL || process.env.AGENT_JOHN_EMAIL || 'john@wentworthre.com';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`re-register:${clientIp(req)}`, 5, 10 * 60_000); // 5 per 10 min
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const firstName = String(body.firstName || '').trim().slice(0, 100);
  const lastName = String(body.lastName || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 50);
  const brokerage = String(body.brokerage || '').trim().slice(0, 200);
  const sessionId = String(body.sessionId || body.callSessionId || '').trim();
  const problem = String(body.problem || '').trim().slice(0, 2000);

  if (!firstName || !lastName || !email || !phone || !brokerage) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const db = admin();

  // Look up the chosen call session.
  const { data: session } = await db
    .from('re_call_sessions')
    .select('id, label, starts_at, zoom_url, is_active')
    .eq('id', sessionId)
    .eq('is_active', true)
    .single();
  if (!session) {
    return NextResponse.json({ error: 'Please pick which call you want to join.' }, { status: 400 });
  }

  const callLabel = session.label || formatCallTime(session.starts_at);
  const callDate = new Date(session.starts_at).toISOString().slice(0, 10);

  // ── Save the RSVP ──
  let regId = '';
  let unsubToken = '';
  try {
    const { data, error } = await db.from('re_mastermind_registrations').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      brokerage,
      call_date: callDate,
      session_id: session.id,
      problem: problem || null,
    }).select('id, unsubscribe_token').single();
    if (error) {
      console.error('[re-register] DB insert failed:', error.message);
      return NextResponse.json({ error: 'We could not process your registration right now. Please try again.' }, { status: 500 });
    }
    regId = data.id;
    unsubToken = data.unsubscribe_token;
  } catch (err) {
    console.error('[re-register] DB insert threw:', err);
    return NextResponse.json({ error: 'We could not process your registration right now. Please try again.' }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const from = `John Wentworth <${fromEmail}>`;
    const zoom = session.zoom_url || '';

    // ── Confirmation to the registrant (with Zoom link + .ics) ──
    try {
      const ics = buildIcs({
        uid: `re-${regId}@winnerscircle`,
        title: 'Elevate Real Estate Mastermind (Live Zoom)',
        description: 'Live Zoom mastermind with John Wentworth. Bring one problem you want solved.',
        startsAt: new Date(session.starts_at),
        durationMinutes: 60,
        url: zoom,
      });
      const inner = `
        <h2 style="margin:0 0 6px;color:#c9a84c;font-size:20px;">You're in, ${escapeHtml(firstName)}! 🎉</h2>
        <p style="margin:0 0 18px;color:#bbb;font-size:14px;line-height:1.6;">Your seat for the Elevate Real Estate Mastermind is reserved. Add it to your calendar (invite attached) and show up live with one problem you want John to help you solve.</p>
        <table role="presentation" width="100%" style="background:#161616;border-radius:10px;margin-bottom:18px;">
          <tr><td style="padding:14px 16px;color:#888;font-size:13px;">When</td><td style="padding:14px 16px;color:#f5f5f5;font-size:14px;font-weight:600;">${escapeHtml(callLabel)}</td></tr>
        </table>
        ${zoom ? `<div style="text-align:center;margin:8px 0 4px;"><a href="${escapeHtml(zoom)}" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Join the Zoom call →</a></div>
        <p style="margin:12px 0 0;color:#666;font-size:12px;text-align:center;word-break:break-all;">${escapeHtml(zoom)}</p>` : `<p style="margin:0;color:#bbb;font-size:13px;">We'll email your Zoom link before the call.</p>`}
      `;
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: `You're registered — ${callLabel.split(' ·')[0]}`,
        html: reEmailShell(inner, { unsubscribeToken: unsubToken }),
        attachments: [{ filename: 'mastermind-invite.ics', content: Buffer.from(ics).toString('base64') }],
      });
      if (error) console.error('[re-register] Confirmation email failed:', error);
      else await db.from('re_mastermind_registrations').update({ confirmation_sent_at: new Date().toISOString() }).eq('id', regId);
    } catch (err) {
      console.error('[re-register] Confirmation email threw:', err);
    }

    // ── Notification to the host ──
    try {
      const row = (l: string, v: string) => `<tr><td style="padding:8px 12px;color:#888;font-size:13px;white-space:nowrap;">${l}</td><td style="padding:8px 12px;color:#f5f5f5;font-size:14px;">${escapeHtml(v)}</td></tr>`;
      await resend.emails.send({
        from,
        to: NOTIFY_EMAIL,
        subject: `🏆 RE Mastermind registration: ${firstName} ${lastName}`,
        html: reEmailShell(`
          <h2 style="margin:0 0 12px;color:#c9a84c;font-size:18px;">New registration</h2>
          <table role="presentation" width="100%" style="background:#161616;border-radius:10px;">
            ${row('Name', `${firstName} ${lastName}`)}${row('Email', email)}${row('Phone', phone)}${row('Brokerage', brokerage)}${row('Call', callLabel)}${problem ? row('Wants help with', problem) : ''}
          </table>`),
      });
    } catch (err) {
      console.error('[re-register] Notification email threw:', err);
    }
  } else {
    console.error('[re-register] RESEND_API_KEY not set — emails skipped.');
  }

  return NextResponse.json({ ok: true });
}
