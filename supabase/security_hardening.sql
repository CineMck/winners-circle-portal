-- ============================================================
-- Security hardening — RUN IN SUPABASE SQL EDITOR before launch.
-- Addresses findings #1 (critical) and #6 from SECURITY_REVIEW.md.
-- Safe to re-run.
-- ============================================================

-- ── #1 CRITICAL: stop members editing privileged profile fields ──
-- The "Users can update own profile" RLS policy has no column restriction and
-- Supabase grants `authenticated` table-wide UPDATE by default, so a member
-- could set their own role='admin' / tier='elite' / subscription_status via the
-- public anon API (privilege escalation + Stripe paywall bypass).
--
-- We enforce with a BEFORE UPDATE trigger rather than column REVOKE/GRANT,
-- because: (a) a column REVOKE is ineffective while a table-level UPDATE grant
-- exists, and (b) re-granting a hand-listed column set is fragile and would
-- break legit edits (full_name, username, bio, industry, phone, avatar_url,
-- and client-side xp_points from challenges). The trigger blocks ONLY the
-- privileged fields, for everyone except the service role (admin API routes).

create or replace function public.prevent_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and (
       new.role                  is distinct from old.role
    or new.tier                  is distinct from old.tier
    or new.is_comped             is distinct from old.is_comped
    or new.subscription_status   is distinct from old.subscription_status
    or new.stripe_customer_id    is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
  ) then
    raise exception 'Not allowed to change privileged profile fields';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_privilege_change on public.profiles;
create trigger trg_prevent_privilege_change
  before update on public.profiles
  for each row execute function public.prevent_privilege_change();

-- Verify from the APP as a normal member (not in this service-role editor):
--   update profiles set tier='elite' where id = auth.uid();   -> must FAIL
--   update profiles set bio='hello'  where id = auth.uid();   -> must SUCCEED


-- ── #6: enforce media upload size + type at the storage layer ──
-- App code limits size/MIME, but a user can call Supabase Storage directly with
-- the public anon key and bypass it. Enforce on the bucket itself (server-side).
update storage.buckets
set
  file_size_limit = 52428800, -- 50 MB
  allowed_mime_types = array[
    'image/jpeg','image/jpg','image/png','image/gif','image/webp','image/heic',
    'video/mp4','video/quicktime','video/mov','video/mpeg','video/webm',
    'application/pdf'
  ]
where id = 'media';


-- ── FOLLOW-UP (not fixed here): XP integrity ──
-- challenges award xp_points via a CLIENT-side update (ChallengeFeedView.tsx),
-- so a member can set arbitrary XP and game the leaderboard. Proper fix is to
-- award XP server-side (an API route using the service role, or a SECURITY
-- DEFINER RPC that validates the challenge completion), then add xp_points to
-- the trigger above. Left working as-is for now to avoid breaking challenges.
