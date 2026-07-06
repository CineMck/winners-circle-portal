-- SMS marketing: member consent + broadcast log.
--
-- 1. profiles.sms_consent  — member opted in to text updates (signup checkbox
--    or profile Settings toggle). TCPA: only consented members are texted.
-- 2. profiles.sms_opt_out  — set by the Twilio STOP webhook; suppresses sends
--    even if consent was previously given.
-- 3. sms_broadcasts        — audit log of admin SMS blasts (service-role only).
--
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table profiles
  add column if not exists sms_consent boolean not null default false,
  add column if not exists sms_opt_out boolean not null default false;

create table if not exists sms_broadcasts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  audience text not null,
  recipient_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Service-role access only (no policies on purpose).
alter table sms_broadcasts enable row level security;
