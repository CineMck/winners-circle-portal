import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateTwilioSignature } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

const emptyTwiml = () =>
  new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });

/**
 * Twilio inbound SMS webhook (configure as the messaging webhook on your number
 * / messaging service). Records STOP-style opt-outs so we suppress future SMS.
 * Twilio also enforces STOP at the carrier level automatically; this keeps our
 * own list in sync.
 */
const STOP_WORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE'];
const START_WORDS = ['START', 'UNSTOP', 'YES'];

export async function POST(req: NextRequest) {
  let from = '';
  let body = '';
  try {
    const form = await req.formData();

    // Verify the request genuinely came from Twilio before acting on it —
    // otherwise anyone could POST From=<victim>&Body=STOP/START and toggle
    // another person's SMS opt-out state (TCPA / marketing-griefing risk).
    const params: Record<string, string> = {};
    for (const [k, v] of form.entries()) params[k] = String(v);
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const publicUrl = `${proto}://${host}${req.nextUrl.pathname}`;
    const sig = req.headers.get('x-twilio-signature');
    const valid = validateTwilioSignature(publicUrl, params, sig);
    if (valid === false) {
      // Token is configured and the signature didn't match → reject.
      return emptyTwiml();
    }
    // valid === null means TWILIO_AUTH_TOKEN isn't set (local/dev) → proceed.

    from = String(form.get('From') || '');
    body = String(form.get('Body') || '').trim().toUpperCase();
  } catch {
    return emptyTwiml();
  }

  const isStop = STOP_WORDS.includes(body);
  const isStart = START_WORDS.includes(body);
  if (from && (isStop || isStart)) {
    const target = from.replace(/\D/g, '').slice(-10); // compare on last 10 digits
    if (target.length === 10) {
      const db = createAdminClient();
      const optOut = isStop; // START clears the suppression again

      // RE marketing list — stored phone formats vary, so normalize in JS and
      // match by trailing digits.
      const { data: regs } = await db.from('re_mastermind_registrations').select('id, phone').eq('sms_opt_out', !optOut);
      const regIds = (regs || [])
        .filter((r) => String(r.phone || '').replace(/\D/g, '').slice(-10) === target)
        .map((r) => r.id);
      if (regIds.length) await db.from('re_mastermind_registrations').update({ sms_opt_out: optOut }).in('id', regIds);

      // Member profiles — same suppression applies to admin SMS broadcasts.
      const { data: profs } = await db.from('profiles').select('id, phone').eq('sms_opt_out', !optOut).not('phone', 'is', null);
      const profIds = (profs || [])
        .filter((p) => String(p.phone || '').replace(/\D/g, '').slice(-10) === target)
        .map((p) => p.id);
      if (profIds.length) await db.from('profiles').update({ sms_opt_out: optOut }).in('id', profIds);
    }
  }

  // Empty TwiML — Twilio's own STOP auto-reply handles confirmation.
  return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
}
