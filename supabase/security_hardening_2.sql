-- ============================================================
-- Security hardening #2 — RUN IN SUPABASE SQL EDITOR.
-- Addresses findings from the July 2026 review (see SECURITY_REVIEW_2.md).
-- Safe to re-run (idempotent). Deploy the matching app code FIRST (the
-- /api/challenges/complete route), then run this.
-- ============================================================

-- ── C1 CRITICAL: any member could self-add to any conversation and read all DMs ──
-- The conversation_participants INSERT policy was `with check (true)`, and the
-- "manage own rows" FOR ALL policy allowed inserting any row where
-- user_id = auth.uid(). Either lets a member insert themselves into an
-- arbitrary conversation, which then satisfies the messages SELECT policy —
-- reading every private 1:1 and higher-tier group thread, live.
--
-- Fix: participants are created ONLY by the service-role message routes
-- (/api/messages, /api/messages/participants, /api/admin/ghost/message), so
-- members need no INSERT at all. Keep SELECT, plus UPDATE (last_read_at) and
-- DELETE (leave) scoped to the member's own row.
drop policy if exists "Users insert participant rows for their conversations" on conversation_participants;
drop policy if exists "Users manage own participant rows" on conversation_participants;
-- (SELECT policy "Users see their own participant rows" is kept as-is.)
drop policy if exists "Members update own participant row" on conversation_participants;
create policy "Members update own participant row"
  on conversation_participants for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Members leave own participant row" on conversation_participants;
create policy "Members leave own participant row"
  on conversation_participants for delete
  using (auth.uid() = user_id);
-- No member INSERT policy: service role adds participants.

-- ── M2: any participant could DELETE/UPDATE the whole conversation ──
-- The conversations policy was FOR ALL using (is participant), so any member
-- (incl. one who self-added via C1) could delete a thread (cascading all
-- messages) or rename/re-tier it. Restrict members to SELECT; the updated_at
-- bump moves to a trigger on message insert (was a client UPDATE).
drop policy if exists "Participants manage conversation" on conversations;
drop policy if exists "Participants read conversation" on conversations;
create policy "Participants read conversation"
  on conversations for select
  using (exists (
    select 1 from conversation_participants
    where conversation_id = conversations.id and user_id = auth.uid()
  ));
-- Members get no UPDATE/DELETE; service role handles group name/member edits.

create or replace function public.bump_conversation_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists trg_bump_conversation_updated_at on public.messages;
create trigger trg_bump_conversation_updated_at
  after insert on public.messages
  for each row execute function public.bump_conversation_updated_at();

-- ── C2: block client writes to xp_points (leaderboard forgery) ──
-- XP is now awarded server-side (/api/challenges/complete), so members should
-- never write xp_points directly. Extend the privilege-change trigger.
create or replace function public.prevent_privilege_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' and (
       new.role                   is distinct from old.role
    or new.tier                   is distinct from old.tier
    or new.is_comped              is distinct from old.is_comped
    or new.subscription_status    is distinct from old.subscription_status
    or new.stripe_customer_id     is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.xp_points              is distinct from old.xp_points
  ) then
    raise exception 'Not allowed to change privileged profile fields';
  end if;
  return new;
end;
$$;
-- trigger trg_prevent_privilege_change already exists (from security_hardening.sql).

-- ── M1: members could self-verify challenge completion ──
-- challenge_participations UPDATE policy let a member set status='verified'
-- (meant to be moderator-only). Block non-staff from setting 'verified'.
create or replace function public.guard_challenge_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare caller_role text;
begin
  if auth.role() = 'service_role' then return new; end if;
  if new.status = 'verified' and (old.status is distinct from 'verified') then
    select role into caller_role from profiles where id = auth.uid();
    if caller_role is null or caller_role not in ('admin','moderator') then
      raise exception 'Only staff can verify challenge completion';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_challenge_status on public.challenge_participations;
create trigger trg_guard_challenge_status
  before update on public.challenge_participations
  for each row execute function public.guard_challenge_status();

-- ── L1: block members pinning their own posts (pin is a mod-only feature) ──
-- Only is_pinned is guarded. is_removed is intentionally left alone: an author
-- removing their OWN post is the legitimate "delete my post" action, already
-- scoped to own posts by the posts UPDATE RLS policy.
create or replace function public.guard_post_staff_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare caller_role text;
begin
  if auth.role() = 'service_role' then return new; end if;
  if (new.is_pinned is distinct from old.is_pinned) then
    select role into caller_role from profiles where id = auth.uid();
    if caller_role is null or caller_role not in ('admin','moderator') then
      raise exception 'Only staff can pin posts';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_post_staff_fields on public.posts;
create trigger trg_guard_post_staff_fields
  before update on public.posts
  for each row execute function public.guard_post_staff_fields();

-- NOTE (H1 — not included here): profiles SELECT policy exposes email / phone /
-- stripe ids / address to every authenticated member. Fixing it safely means
-- introducing a public-columns view and changing the app's `profiles(*)` joins
-- (home feed, challenge feed, messages) to a safe column list — a coordinated
-- app+DB change. Tracked in SECURITY_REVIEW_2.md, left for a dedicated pass.
