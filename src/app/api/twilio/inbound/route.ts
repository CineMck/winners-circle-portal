import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Twilio inbound SMS webhook (configure as the messaging webhook on your number
 * / messaging service). Records STOP-style opt-outs so we suppress future SMS.
 * Twilio also enforces STOP at the carrier level automatically; this keeps our
 * own list in sync.
 */
const STOP_WORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE'];

export async function POST(req: NextRequest) {
  let from = '';
  let body = '';
  try {
    const form = await req.formData();
    from = String(form.get('From') || '');
    body = String(form.get('Body') || '').trim().toUpperCase();
  } catch {
    return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  }

  if (from && STOP_WORDS.includes(body)) {
    const target = from.replace(/\D/g, '').slice(-10); // compare on last 10 digits
    if (target.length === 10) {
      const db = createAdminClient();
      // Stored phone formats vary, so normalize in JS and match by trailing digits.
      const { data } = await db.from('re_mastermind_registrations').select('id, phone').eq('sms_opt_out', false);
      const ids = (data || [])
        .filter((r) => String(r.phone || '').replace(/\D/g, '').slice(-10) === target)
        .map((r) => r.id);
      if (ids.length) await db.from('re_mastermind_registrations').update({ sms_opt_out: true }).in('id', ids);
    }
  }

  // Empty TwiML — Twilio's own STOP auto-reply handles confirmation.
  return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
}
