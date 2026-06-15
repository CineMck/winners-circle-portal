import { createHash } from 'node:crypto';

// Meta Conversions API (server-side events).
//
// Sends the same conversions the browser Pixel fires, but server-to-server, so
// events still land when the browser Pixel is blocked by ad blockers, iOS, or
// Safari privacy protections. The browser event and the server event share an
// `event_id`, and Meta deduplicates them into a single conversion.
//
// This is INERT until META_CAPI_ACCESS_TOKEN is set (a system-user token
// generated in Meta Business Settings → Conversions API). The Pixel/dataset ID
// matches the browser Pixel via NEXT_PUBLIC_META_PIXEL_ID.

const GRAPH_VERSION = 'v21.0';
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1517559003151909';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

// Normalize (trim + lowercase) then SHA-256, per Meta's Advanced Matching
// spec. Returns undefined for empty input so we never send a hash of "".
function hashNorm(value: string | undefined | null): string | undefined {
  const v = (value || '').trim().toLowerCase();
  return v ? sha256(v) : undefined;
}

// Phone: strip to digits and hash. A bare 10-digit number is assumed US and
// gets a leading country code, which is what Meta expects.
function hashPhone(value: string | undefined | null): string | undefined {
  let digits = (value || '').replace(/[^0-9]/g, '');
  if (!digits) return undefined;
  if (digits.length === 10) digits = `1${digits}`;
  return sha256(digits);
}

export interface MetaLeadParams {
  eventId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}

/**
 * Send a server-side "Lead" event to the Meta Conversions API.
 * Best-effort: never throws, logs failures. No-op if no access token is set.
 */
export async function sendMetaLeadEvent(params: MetaLeadParams): Promise<void> {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return; // CAPI not configured — silently skip.

  const userData: Record<string, unknown> = {};
  const em = hashNorm(params.email);
  const ph = hashPhone(params.phone);
  const fn = hashNorm(params.firstName);
  const ln = hashNorm(params.lastName);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.userAgent) userData.client_user_agent = params.userAgent;
  if (params.fbp) userData.fbp = params.fbp;
  if (params.fbc) userData.fbc = params.fbc;

  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: 'website',
        ...(params.eventSourceUrl ? { event_source_url: params.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: { content_name: 'Real Estate Mastermind Registration' },
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[meta-capi] Lead event failed:', res.status, text);
    }
  } catch (err) {
    console.error('[meta-capi] Lead event threw:', err);
  }
}
