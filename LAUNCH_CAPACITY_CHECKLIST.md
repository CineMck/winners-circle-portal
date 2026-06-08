# Launch Capacity Checklist — Winners Circle Portal

How the platform handles general (non-video) traffic, and what to do before launch.
Video is handled separately by Mux (see `MUX_SETUP.md`).

## Already in good shape
- All data access goes through Supabase's REST API — no direct Postgres
  connections, so no connection-pool exhaustion under load.
- Feeds are bounded (home 30, channels 50, leaderboard 5) — no unbounded queries.
- Good index coverage on hot tables (posts, comments, messages, notifications, events).
- The Next.js app is stateless — safe to run multiple replicas.

## Code/DB changes already implemented
- [x] **Home data caching** — admin announcement feed + leaderboard are cached
      ~30s and shared across all users (`home/page.tsx`), cutting DB reads under load.
- [x] **Leaderboard index** — `supabase/performance_indexes.sql` (run it).
- [x] **Rate limiting** — on `real-estate/register` (per IP), `referrals/send`
      and `elite-request` (per user). In-memory; see note in `lib/rateLimit.ts`.

## To do before launch (infrastructure — your side)

### 1. Upgrade Supabase compute (highest priority)
Currently on **Micro** (1 GB RAM, 60 max connections). Move to at least **Small**
for launch. This raises RAM, max connections, and Realtime headroom together.
- Watch **Realtime concurrent connections**: every open session holds a websocket
  for the notification bell (and messages), so active-users ≈ realtime-connections.
  Confirm your plan's quota covers expected concurrency.
- If reads get heavy later, add a **read replica**.

### 2. Put Cloudflare (or similar) in front of Railway
Railway has no edge cache or WAF on its own. Cloudflare gives you:
- CDN caching for `/_next/static` assets (big bandwidth + latency win)
- DDoS / bot protection
- Edge rate limiting / WAF (complements the app-level limiter)

### 3. Run ≥2 Railway replicas + healthcheck
The app is stateless, so add a second replica for redundancy and throughput, and
configure a healthcheck path so Railway can recycle unhealthy instances.

### 4. Monitoring + load test
- Add error tracking (e.g. Sentry).
- Watch the Supabase dashboard: slow queries, connection count trend, DB CPU.
- Run a quick load test (k6 or Artillery) against a staging deploy to find the
  real ceiling before users do.

## SQL to run in Supabase (one time)
- `supabase/performance_indexes.sql` — leaderboard + role indexes
- `supabase/security_hardening.sql` — the critical RLS trigger + storage limits
- `supabase/add_post_media_thumbnails.sql` — if not already applied

## Known follow-ups (not blocking, but worth scheduling)
- **XP integrity:** challenge XP is awarded client-side; move it server-side, then
  add `xp_points` to the privilege-change trigger.
- **Profile PII via RLS:** the `profiles` SELECT policy exposes all columns
  (email, address, phone, Stripe IDs) to any authenticated user. Consider a view
  or column-limited policy that hides sensitive fields from other members.
- **Rate limiter** is per-instance (in-memory); move to Upstash/Cloudflare for a
  hard global limit once you're multi-replica.
