/**
 * Twilio outbound SMS via the REST API (no SDK dependency).
 *
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and one of
 *      TWILIO_MESSAGING_SERVICE_SID (recommended for A2P 10DLC) or TWILIO_FROM_NUMBER.
 * No-ops gracefully (returns ok:false) when not configured.
 *
 * NOTE: US business SMS requires A2P 10DLC brand+campaign registration in Twilio,
 * or carriers will filter your messages. Only text contacts who opted in.
 */

export function twilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );
}

/** Best-effort normalize a US phone to E.164 (+1XXXXXXXXXX). */
export function toE164(raw: string): string | null {
  const s = String(raw || '').trim();
  if (s.startsWith('+')) return s.replace(/[^\d+]/g, '');
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const msgSvc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || (!from && !msgSvc)) return { ok: false, error: 'Twilio not configured' };

  const e164 = toE164(to);
  if (!e164) return { ok: false, error: `Invalid phone: ${to}` };

  const params = new URLSearchParams();
  params.set('To', e164);
  if (msgSvc) params.set('MessagingServiceSid', msgSvc);
  else params.set('From', from!);
  params.set('Body', body);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, error: `Twilio ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, sid: data.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}
