# Winners Circle Portal — Security Review #2 (July 16, 2026)

Full review of the portal app (`winners-circle-portal-app`) covering every API route, auth/RLS, the database policies, client-side Supabase writes, secrets, webhooks, and headers. This is a follow-up to the June `SECURITY_REVIEW.md`.

---

## 0. About the Cloudflare email

The "Last month Cloudflare detected 404 security threats for winnerscircleportal.com" email is **a marketing upsell, not a breach or incident.** Cloudflare sends these automatically to Free-plan domains: it counts routine, already-blocked noise (bot scans, malformed requests, automated probes hitting every site on the internet) and uses the number to sell you the paid WAF / Pro plan. The email even says the threats "were mitigated by Cloudflare with the basic WAF and bot protection you have on the Free plan" — i.e. nothing got through. 404 blocked probes in a month is unremarkable for any public site.

So: no action is required *because of the email*. The upgrade it pitches (paid WAF, rate limiting at the edge) is a reasonable nice-to-have but not urgent. The real risks below are in the application, which is where a determined attacker would actually operate — the anon Supabase key ships in the browser, so the database's own rules (RLS) are the true perimeter, not Cloudflare.

---

## 1. Fix these yourself — highest priority (not code-fixable by me)

### 🔴 CRITICAL — Rotate the Supabase service-role key
`.env.local` contains a **real, valid** `SUPABASE_SERVICE_ROLE_KEY` (a signed JWT, not a placeholder — the Stripe keys next to it *are* `REPLACE_ME`, but this one is live). `.gitignore` excludes `.env*`, so it's likely never been pushed — but this key bypasses all database security. Anyone who ever gets a copy (a backup, a shared screenshot, an accidental `git add -f`) has full read/write to every table, including setting anyone to admin.

**Do:** Supabase dashboard → Project Settings → API → roll the `service_role` key, update it in Railway's variables, redeploy. Confirm it isn't in git history: `git log -p --all -S SUPABASE_SERVICE_ROLE_KEY` should return nothing.

---

## 2. Code fixes I applied (in this change set, non-breaking)

These are shipped in the source files and verified with a clean `next build`. They deploy safely with a normal `git push` — **but read §3 first**, because the same push carries code that depends on the SQL migrations.

| # | Issue | Fix |
|---|---|---|
| M2 | **Twilio inbound webhook had no signature check** — anyone could POST `From=<victim>&Body=STOP`/`START` and toggle another person's SMS opt-out (TCPA/griefing). | Added `X-Twilio-Signature` verification (`src/lib/twilio.ts` → `validateTwilioSignature`, enforced in `api/twilio/inbound`). Verifies only when `TWILIO_AUTH_TOKEN` is set, so local dev still works. |
| M3 | **Stripe checkout accepted any `priceId`** — a user could pass a cheaper/legacy price and still be granted a paid tier by the webhook. | `api/stripe/checkout` now allowlists the public tier price IDs from env. |
| M4/M3 | **`/api/notify/mention` allowed notification spam/phishing** — any member could fire "X mentioned you" push + in-app notices at anyone, for any post, with attacker-controlled text. | Added per-user rate limit (30/10min), capped direct tags at 50, require a valid existing `postId`, and require the caller to be the post's author for post-context mentions. |
| M5 | **Billing routes allowed moderators** to charge cards, refund arbitrary charges, comp tiers, cancel subs. | `api/admin/billing/{charge,refund,comp,subscription}` now require `role === 'admin'` (not moderator). |
| L6 | **`/api/admin/video-thumbnail` had no auth** — any logged-in member could call it (it makes server-side outbound fetches). | Added the standard admin/mod gate. |
| L | **Missing security headers.** | Added `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS in `next.config.ts`. |

I also moved challenge XP awarding server-side (`api/challenges/complete`, wired into `ChallengeFeedView`) — this is the app half of the C2/M1 fix below.

---

## 3. Database fixes — ready to run, but YOU must run them (they're in the report bucket)

These are the most serious *application* findings. I've written the migration; it can't take effect until you run it in Supabase. **Run `supabase/security_hardening_2.sql` in the SQL editor.**

### 🔴 CRITICAL C1 — Any member could read every private DM
The `conversation_participants` INSERT policy was `with check (true)`. Any logged-in member could insert themselves into **any** conversation (via the shipped anon key, bypassing the UI) and then read the entire private 1:1 or higher-tier group thread — live, through the same realtime channel. This is the single most serious finding. The migration removes member INSERT entirely (participants are only ever added by service-role routes) and scopes update/delete to the member's own row.

### 🔴 C2 — Members could set their own XP to anything (leaderboard forgery)
`xp_points` was awarded by a **client-side** `profiles.update(...)`, and the privilege-change trigger didn't cover it. A member could run `update profiles set xp_points = 999999`. Fixed in two parts: XP is now awarded server-side (already in the code push), and the migration adds `xp_points` to the block-list trigger.

### 🟠 M1 — Members could self-verify challenge completion
`challenge_participations` let a member set `status='verified'` (meant to be moderator-only). The migration adds a trigger blocking non-staff from setting `verified`.

### 🟠 M2 — Any participant could delete a whole conversation
The `conversations` policy was `FOR ALL` (including DELETE/UPDATE) for any participant — so a member could delete a thread (cascading all messages) or rename/re-tier a group. The migration restricts members to SELECT and moves the `updated_at` bump to a trigger.

### 🟡 L1 — Members could pin their own posts
`is_pinned` was writable by post authors (pin is a mod-only feature). The migration blocks it. (Removing your *own* post stays allowed.)

**Deploy order for this change set:**
1. Rotate the service-role key (§1).
2. Run `supabase/ghost_authoring.sql` (adds ghost columns — see the feature notes).
3. Run `supabase/security_hardening_2.sql`.
4. `git push origin main` (Railway deploys the app code).

Doing the SQL first is important: the app code now calls `/api/challenges/complete` and inserts the ghost columns, both of which expect the migrations to have run.

---

## 4. Still open — recommend a dedicated follow-up (not fixed here)

### 🟠 H1 — Every member can read all other members' PII
The `profiles` SELECT policy is `using (true)` with no column restriction, and the table now holds `email`, `phone`, `birthday`, home address fields, `stripe_customer_id`, `stripe_subscription_id`, and `subscription_status`. Any member can query the full roster's contact info and Stripe identifiers through the anon key. Also leaked in-app via `profiles(*)` joins on the home/challenge feeds.

I did **not** auto-fix this because the safe fix (a public-columns view + changing the app's `select('*')` joins on home feed, challenge feed, and messages to a safe column list) is a coordinated app+DB change that needs testing to avoid breaking those pages. Worth a focused pass soon — this is a privacy exposure, not just theoretical. Happy to do it as the next task.

### Lower priority
- **In-memory rate limiter** (`src/lib/rateLimit.ts`) resets per deploy and is per-replica. Fine for now; move to Upstash/Redis if you scale to multiple Railway instances or want a hard global limit. (The Cloudflare paid plan's edge rate-limiting would also cover this.)
- **Storage `media` bucket** is public-read and any authed user can write to any path prefix (size/MIME *are* enforced). Restore the per-user path check if you want folder isolation.
- **`event_rsvps`** attendee lists are readable by all members (low privacy impact).
- **Firebase client keys** in the iOS/Android bundles are *not* secret (they're designed to ship in apps) — just make sure Firebase security rules are set. No action needed on the keys themselves.

---

## 5. What's already solid (verified OK)

Stripe webhook signature verification; all cron routes fail **closed** (missing secret → 401); `/api/upload`, `/api/invite`, update/delete-member, reset-password all correctly gated (the June fixes held); notifications can't be forged directly (no INSERT policy — the mention API was the only hole, now hardened); no table had RLS disabled. The exposure was over-broad *policies*, not missing ones.
