/**
 * Lightweight in-memory rate limiter (fixed window).
 *
 * Good enough to blunt spam/abuse on public + email-sending endpoints without
 * adding infrastructure. Caveat: state is per-instance, so with multiple Railway
 * replicas the effective limit is (limit × replicas), and it resets on deploy.
 * For a hard global limit later, move this to Upstash Redis / Cloudflare.
 */

interface Bucket { count: number; resetAt: number; }

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  // Occasionally drop expired buckets so the Map can't grow unbounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
}

export interface RateLimitResult { ok: boolean; retryAfter: number; }

/**
 * @param key       unique caller identity (e.g. `register:<ip>` or `referral:<userId>`)
 * @param limit     max requests allowed per window
 * @param windowMs  window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (Railway sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/** Standard 429 response body + Retry-After header. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } }
  );
}
