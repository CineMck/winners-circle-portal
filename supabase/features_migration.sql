-- ============================================================
-- Winners Circle: DMs + Events + Resources + Push Notifications
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. DIRECT MESSAGES ──────────────────────────────────────

create table if not exists conversations (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_conv_participants_user_id on conversation_participants(user_id);

-- RLS: conversations
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

create policy "Users see their own conversations"
  on conversations for select using (
    exists (select 1 from conversation_participants where conversation_id = conversations.id and user_id = auth.uid())
  );
create policy "Participants manage conversation"
  on conversations for all using (
    exists (select 1 from conversation_participants where conversation_id = conversations.id and user_id = auth.uid())
  );

create policy "Users see their own participant rows"
  on conversation_participants for select using (
    conversation_id in (select conversation_id from conversation_participants where user_id = auth.uid())
  );
create policy "Users manage own participant rows"
  on conversation_participants for all using (auth.uid() = user_id);
create policy "Users insert participant rows for their conversations"
  on conversation_participants for insert with check (true);

create policy "Participants read messages"
  on messages for select using (
    exists (select 1 from conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid())
  );
create policy "Participants send messages"
  on messages for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid())
  );

-- ── 2. EVENTS / LIVE SESSIONS ────────────────────────────────

create table if not exists events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  zoom_link       text,
  recording_url   text,
  starts_at       timestamptz not null,
  duration_minutes int not null default 60,
  tier_required   text not null default 'free',
  is_published    boolean not null default false,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists event_rsvps (
  event_id    uuid not null references events(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_events_starts_at on events(starts_at);
create index if not exists idx_event_rsvps_user_id on event_rsvps(user_id);

alter table events enable row level security;
alter table event_rsvps enable row level security;

create policy "Authenticated users read published events"
  on events for select using (auth.uid() is not null and is_published = true);
create policy "Admins manage all events"
  on events for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator'))
  );

create policy "Users manage own RSVPs"
  on event_rsvps for all using (auth.uid() = user_id);
create policy "Users read all RSVPs for events they can see"
  on event_rsvps for select using (auth.uid() is not null);

-- ── 3. RESOURCE LIBRARY ─────────────────────────────────────

create table if not exists resource_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists resources (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  file_url        text,
  file_type       text,
  file_size_bytes bigint,
  category_id     uuid references resource_categories(id) on delete set null,
  tier_required   text not null default 'free',
  is_published    boolean not null default true,
  download_count  int not null default 0,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_resources_category_id on resources(category_id);

alter table resource_categories enable row level security;
alter table resources enable row level security;

create policy "Authenticated users read categories"
  on resource_categories for select using (auth.uid() is not null);
create policy "Admins manage categories"
  on resource_categories for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator'))
  );

create policy "Authenticated users read published resources"
  on resources for select using (auth.uid() is not null and is_published = true);
create policy "Admins manage all resources"
  on resources for all using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator'))
  );

-- ── 4. PUSH NOTIFICATION SUBSCRIPTIONS ──────────────────────

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);

-- Insert default resource categories
insert into resource_categories (name, sort_order) values
  ('Mindset & Performance', 0),
  ('Business & Sales', 1),
  ('Real Estate', 2),
  ('Templates & Toolkits', 3),
  ('Recordings & Replays', 4)
on conflict do nothing;
