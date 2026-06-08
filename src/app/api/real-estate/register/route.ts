import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { rateLimit, clientIp, tooManyRequests } from '@/lib/rateLimit';

/**
 * POST /api/real-estate/register
 * Body: { firstName, lastName, email, phone, brokerage, callDate, problem? }
 *
 * Handles registrations for the Elevate Real Estate Mastermind page
 * (/real-estate). Saves the registration to Supabase and emails a
 * notification. Run supabase/re_mastermind_registrations.sql once to
 * create the table.
 */

const NOTIFY_EMAIL =
  process.env.RE_NOTIFY_EMAIL || process.env.AGENT_JOHN_EMAIL || 'john@wentworthre.com';

const VALID_CALL_DATES = ['2026-06-17', '2026-06-30'];

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

export async function POST(req: NextRequest) {
  // Public endpoint — throttle by IP to limit spam registrations.
  const rl = rateLimit(`re-register:${clientIp(req)}`, 5, 10 * 60_000); // 5 per 10 min
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const firstName = String(body.firstName || '').trim().slice(0, 100);
  const lastName = String(body.lastName || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 50);
  const brokerage = String(body.brokerage || '').trim().slice(0, 200);
  const callDate = String(body.callDate || '');
  const problem = String(body.problem || '').trim().slice(0, 2000);

  if (!firstName || !lastName || !email || !phone || !brokerage) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!VALID_CALL_DATES.includes(callDate)) {
    return NextResponse.json({ error: 'Please pick which call you want to join.' }, { status: 400 });
  }

  // ── Save to Supabase ──
  let dbOk = false;
  try {
    const { error } = await admin().from('re_mastermind_registrations').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      brokerage,
      call_date: callDate,
      problem: problem || null,
    });
    if (error) {
      console.error('[re-register] DB insert failed:', error.message);
    } else {
      dbOk = true;
    }
  } catch (err) {
    console.error('[re-register] DB insert threw:', err);
  }

  // ── Email notification ──
  let emailOk = false;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const dateLabel = callDate === '2026-06-17' ? 'Wednesday, June 17 · 12:00pm ET' : 'Tuesday, June 30 · 12:00pm ET';
      const row = (label: string, value: string) =>
        `<tr><td style="padding:8px 12px;color:#888;font-size:13px;white-space:nowrap;">${label}</td><td style="padding:8px 12px;color:#f5f5f5;font-size:14px;">${escapeHtml(value)}</td></tr>`;
      const { error } = await resend.emails.send({
        from: `The Winner's Circle <${fromEmail}>`,
        to: NOTIFY_EMAIL,
        subject: `🏆 RE Mastermind registration: ${firstName} ${lastName} (${dateLabel.split(' ·')[0]})`,
        html: `
<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#111;border:1px solid #1e1e1e;border-radius:14px;overflow:hidden;">
    <tr><td style="padding:24px 28px 8px;">
      <h2 style="margin:0 0 4px;color:#c9a84c;font-size:18px;">New Elevate RE Mastermind registration</h2>
      <p style="margin:0 0 16px;color:#888;font-size:13px;">Submitted via the /real-estate page</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#161616;border-radius:10px;">
        ${row('Name', `${firstName} ${lastName}`)}
        ${row('Email', email)}
        ${row('Phone', phone)}
        ${row('Brokerage', brokerage)}
        ${row('Call', dateLabel)}
        ${problem ? row('Wants help with', problem) : ''}
      </table>
      <p style="margin:16px 0 24px;color:#666;font-size:12px;">Reply to the registrant directly at ${escapeHtml(email)} with the Zoom link and calendar invite.</p>
    </td></tr>
  </table>
</body></html>`,
      });
      if (error) {
        console.error('[re-register] Email send failed:', error);
      } else {
        emailOk = true;
      }
    } catch (err) {
      console.error('[re-register] Email send threw:', err);
    }
  } else {
    console.error('[re-register] RESEND_API_KEY not set — skipping notification email.');
  }

  if (!dbOk && !emailOk) {
    return NextResponse.json(
      { error: 'We could not process your registration right now. Please try again in a minute.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
