-- Native push tokens for iOS & Android (Capacitor + FCM).
-- Web Push subscriptions still live in `push_subscriptions` (unchanged).

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (token)
);

create index if not exists device_push_tokens_user_id_idx on device_push_tokens(user_id);

alter table device_push_tokens enable row level security;

-- A user can see/manage their own tokens; everyone else (including server-side
-- code that uses the service-role key) bypasses RLS as usual.
create policy "owners read own tokens"
  on device_push_tokens for select
  using (auth.uid() = user_id);

create policy "owners insert own tokens"
  on device_push_tokens for insert
  with check (auth.uid() = user_id);

create policy "owners update own tokens"
  on device_push_tokens for update
  using (auth.uid() = user_id);

create policy "owners delete own tokens"
  on device_push_tokens for delete
  using (auth.uid() = user_id);
