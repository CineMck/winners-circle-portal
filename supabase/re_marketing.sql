-- ============================================================
-- Elevate RE Mastermind — call sessions, marketing list, reminders.
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- Admin-managed call sessions (date/time + Zoom link).
create table if not exists re_call_sessions (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,            -- e.g. "Wednesday, June 17 · 12:00pm ET"
  starts_at  timestamptz not null,     -- precise start (reminders + .ics use this)
  zoom_url   text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table re_call_sessions enable row level security;
drop policy if exists "admins_manage_call_sessions" on re_call_sessions;
create policy "admins_manage_call_sessions" on re_call_sessions for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));

-- Marketing / reminder columns on the registrations (RSVP) table.
alter table re_mastermind_registrations
  add column if not exists session_id uuid references re_call_sessions(id) on delete set null,
  add column if not exists unsubscribed boolean not null default false,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists confirmation_sent_at   timestamptz,
  add column if not exists reminder_24h_sent_at    timestamptz,
  add column if not exists reminder_1h_sent_at     timestamptz,
  add column if not exists reminder_start_sent_at  timestamptz;

-- Let admins read/manage the RSVP list (table was previously service-role-only).
drop policy if exists "admins_manage_registrations" on re_mastermind_registrations;
create policy "admins_manage_registrations" on re_mastermind_registrations for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));

create index if not exists re_reg_session_idx     on re_mastermind_registrations(session_id);
create index if not exists re_reg_unsub_token_idx  on re_mastermind_registrations(unsubscribe_token);
create index if not exists re_call_sessions_active_idx on re_call_sessions(is_active, starts_at);
