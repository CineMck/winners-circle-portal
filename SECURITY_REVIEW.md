# Winners Circle Portal — Security Review

_Pre-launch review of the codebase and Supabase/Stripe/storage setup, June 2026._

**Important caveat:** RLS policies and storage policies are applied to Supabase manually from the `supabase/*.sql` files. This review reads those files plus the app code. Before launch, **confirm the live database actually matches** (Supabase Dashboard → Authentication → Policies, and Storage → Policies), since a file in the repo doesn't guarantee it was run.

---

## Summary

| # | Severity | Issue |
|---|----------|-------|
| 1 | **Critical** | Members can change their own `role`/`tier` via the public API (privilege escalation + paywall bypass) |
| 2 | **High** | `/api/upload` is unauthenticated and trusts a client-supplied `userId` |
| 3 | **High** | `/api/invite` is unauthenticated — anyone can mint invites and pre-assign paid tiers |
| 4 | **Medium** | Moderators can grant admin / change tiers / delete members |
| 5 | **Medium** | `/api/agent/daily-report` cron auth is fail-open if the secret env var is unset |
| 6 | **Medium** | Storage policy lets any signed-in user write the whole `media` bucket; app-level size/type limits are bypassable |
| 7 | **Medium** | Dependency vulnerabilities (2 high, 10 moderate) via `firebase-admin` |
| 8 | **Low** | No rate limiting on public email-sending endpoints |
| 9 | **Low** | Some routes return raw error messages |

### What's already solid
- Stripe webhook verifies the signature (`constructEvent`) before trusting events. ✓
- All `/api/admin/*` routes check the caller's `role` server-side. ✓
- No `dangerouslySetInnerHTML` / `eval` / raw `innerHTML` anywhere; React auto-escaping is intact. ✓
- No secrets exposed through `NEXT_PUBLIC_` vars (only URL, anon key, Stripe publishable, VAPID public). ✓
- `.env*` is gitignored. ✓
- Stripe checkout/portal/cancel are auth-gated and operate only on the caller's own subscription. ✓
- The auth-callback origin bug (the recent localhost redirect) is fixed. ✓

---

## 1. CRITICAL — Members can escalate their own role and tier

**Where:** `supabase/schema.sql` (profiles RLS)
```sql
create policy "Users can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);
```

**Problem:** This policy lets a user update their own profile row but places **no restriction on which columns**. Supabase grants the `authenticated` role column-wide UPDATE by default, and there's no protective trigger or column `REVOKE`. So any logged-in member can call the **public** anon API directly (the anon key ships in the client) and run:

```js
supabase.from('profiles')
  .update({ role: 'admin', tier: 'elite', subscription_status: 'active' })
  .eq('id', myUserId)
```

**Impact:**
- Any member can promote themselves to **admin** — which then unlocks every `/api/admin/*` route (those trust `profiles.role`), i.e. billing, member deletion, password resets, mass email, push broadcasts.
- Any member can grant themselves **elite/founding tier for free**, bypassing Stripe entirely.

This is the top priority to fix before launch.

**Fix (recommended — column-level REVOKE so only the service role can change sensitive fields):**
```sql
revoke update (role, tier, subscription_status, stripe_customer_id,
               stripe_subscription_id, is_comped) on public.profiles
  from authenticated, anon;
```
The admin API routes use the service-role key, so they keep working; members can still edit their own name/avatar/bio. Optionally also add a BEFORE UPDATE trigger that raises if a non-admin changes `role`/`tier`, as defense in depth. After applying, re-test that a normal member cannot change those fields.

---

## 2. HIGH — `/api/upload` is unauthenticated and trusts client `userId`

**Where:** `src/app/api/upload/route.ts`

**Problem:** The route never calls `getUser()`. It reads `userId` and `folder` from the multipart body and writes with the **service-role key** (bypassing RLS) to `${folder}/${userId}/…`. So:
- Anyone on the internet (no login) can upload files to your storage → storage-cost abuse / DoS, and content served from your own domain.
- The `userId` is attacker-controlled (spoof ownership), and `folder` is unvalidated (path control).

**Impact:** Unauthenticated writes to the `media` bucket. Currently this route is only *used* by the admin Resources page, but the endpoint itself is open to the world.

**Fix:** Authenticate the caller and derive identity server-side; gate to admins if it's only for resources:
```js
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// if admin-only:
const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
if (!p || !['admin','moderator'].includes(p.role)) return NextResponse.json({ error:'Forbidden' }, { status: 403 });
// ignore any client userId; use user.id. Validate folder against an allowlist.
```

---

## 3. HIGH — `/api/invite` is unauthenticated and assigns tiers

**Where:** `src/app/api/invite/route.ts`

**Problem:** The POST handler starts straight at `const { email, tier, … } = await req.json()` with **no auth check**. It then uses the service-role key to generate a Supabase invite link and **pre-create a profile with an attacker-chosen `tier`**.

**Impact:** Anyone can: trigger invite emails to arbitrary addresses from your domain (spam/abuse, reputation), and pre-seed accounts at paid tiers. Combined with #1 this is another route to a free paid account.

**Fix:** Require an authenticated admin/moderator (same pattern as the other admin routes) before generating links or writing profiles.

---

## 4. MEDIUM — Moderators can grant admin, change tiers, and delete members

**Where:** `src/app/api/admin/update-member/route.ts`, `delete-member/route.ts`

**Problem:** These accept `['admin','moderator']`. So a **moderator** can set anyone's `role` to `admin` (including themselves), change tiers (free paid access), or delete members. `reset-password` correctly restricts to `admin` only — the same restriction should apply to role/tier changes and deletion.

**Fix:** Gate role changes, tier changes, and member deletion to `role === 'admin'`. Let moderators do lighter moderation only.

---

## 5. MEDIUM — Cron endpoint fails open

**Where:** `src/app/api/agent/daily-report/route.ts`
```js
if (process.env.AGENT_CRON_SECRET && secret !== process.env.AGENT_CRON_SECRET) { /* reject */ }
```

**Problem:** If `AGENT_CRON_SECRET` is unset, the condition is false and the request is **allowed**. This endpoint calls the Anthropic API (real spend) and reads member data. (By contrast, `push/event-reminders` is correctly fail-closed.)

**Fix:** Reject when the secret is missing or mismatched:
```js
if (!process.env.AGENT_CRON_SECRET || secret !== process.env.AGENT_CRON_SECRET)
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```
Apply the same check to both spots in this file.

---

## 6. MEDIUM — Broad storage write policy; app-level limits are bypassable

**Where:** `supabase/storage_upload_policy_v2.sql`

**Problem:** The active policy allows **any authenticated user to insert into the entire `media` bucket** (the per-user-folder check was removed for an iOS WebView issue). The 50 MB cap and MIME allowlist live only in app code (`lib/upload.ts` / the upload route) — a user can call Supabase Storage directly with the public anon key and upload arbitrary file types and sizes, into any folder. The bucket is public-read.

**Impact:** Storage abuse, oversized files, and content of unintended types hosted on your domain.

**Fix options:** Set a bucket-level file-size limit and allowed-MIME list in Supabase (Storage → bucket settings), which is enforced server-side regardless of client. If per-user isolation matters, restore a path check that also works in the WebView (e.g. validate `(storage.foldername(name))[2] = auth.uid()::text`).

---

## 7. MEDIUM — Dependency vulnerabilities

`npm audit` reports **12 vulnerabilities (2 high, 10 moderate)**, all transitive under `firebase-admin` (gaxios/google-gax/uuid/retry-request). Server-side only.

**Fix:** `npm audit fix`, and update `firebase-admin` to the latest major; re-run `npm audit`. Re-test push notifications afterward.

---

## 8. LOW — No rate limiting on public email endpoints

`/api/real-estate/register`, `/api/referrals/send`, `/api/invite`, `/api/elite-request` send email and have no throttling → spam/abuse and Resend reputation risk. Add basic rate limiting (per IP/user) or a captcha on the public ones.

## 9. LOW — Raw error messages returned

A few routes (e.g. `stripe/checkout`, `stripe/cancel`) return `err.message` to the client. Minor information disclosure; prefer a generic message and log details server-side.

---

## Suggested order before launch
1. **#1 profiles RLS** (one SQL statement) — do this first.
2. **#2 `/api/upload`** and **#3 `/api/invite`** auth.
3. **#4** admin-only role/tier/delete, **#5** cron fail-closed.
4. **#6** storage limits, **#7** dependency updates.
5. **#8–9** hardening.

Items #1, #4, #6 are database/config changes (verify against the live Supabase project); the rest are code changes that deploy via Railway.
