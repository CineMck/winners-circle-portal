-- Registrations from the Elevate Real Estate Mastermind page (/real-estate).
-- Run this once in the Supabase SQL editor.

create table if not exists re_mastermind_registrations (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  brokerage text not null,
  call_date date not null,
  problem text,
  created_at timestamptz not null default now()
);

-- Lock the table down; the API route writes with the service-role key,
-- which bypasses RLS. No public read/write policies are needed.
alter table re_mastermind_registrations enable row level security;

create index if not exists re_mastermind_registrations_call_date_idx
  on re_mastermind_registrations (call_date);
