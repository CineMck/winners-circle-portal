-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Enum types
create type member_tier as enum ('free', 'core', 'elite', 'founding');
create type user_role as enum ('member', 'moderator', 'admin');
create type challenge_status as enum ('enrolled', 'completed', 'verified');
create type moderation_action as enum ('pin', 'unpin', 'remove_post', 'remove_comment', 'mute_member', 'unmute_member', 'verify_completion');
create type notification_type as enum ('challenge_new', 'comment', 'reaction', 'follow', 'challenge_complete', 'mention');

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  username text unique not null,
  avatar_url text,
  bio text,
  tier member_tier default 'free' not null,
  role user_role default 'member' not null,
  xp_points integer default 0 not null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  is_muted boolean default false,
  muted_until timestamptz,
  followers_count integer default 0,
  following_count integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Follows
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Channels
create table channels (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  icon text default 'hash',
  tier_required member_tier default 'free' not null,
  is_archived boolean default false,
  sort_order integer default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now() not null
);

-- Challenges
create table challenges (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  instructions_video_url text,
  instructions_video_thumbnail text,
  tier_required member_tier default 'free' not null,
  xp_reward integer default 100,
  badge_name text,
  badge_icon text,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  is_evergreen boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Challenge participations
create table challenge_participations (
  id uuid default uuid_generate_v4() primary key,
  challenge_id uuid references challenges(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status challenge_status default 'enrolled',
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  unique(challenge_id, user_id)
);

-- Posts
create table posts (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references channels(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  media_urls text[] default '{}',
  is_pinned boolean default false,
  is_removed boolean default false,
  removed_reason text,
  removed_by uuid references profiles(id),
  reaction_count integer default 0,
  comment_count integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  check (channel_id is not null or challenge_id is not null)
);

create index posts_channel_id_idx on posts(channel_id);
create index posts_challenge_id_idx on posts(challenge_id);
create index posts_author_id_idx on posts(author_id);
create index posts_created_at_idx on posts(created_at desc);

-- Post reactions
create table post_reactions (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Comments
create table comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  is_removed boolean default false,
  removed_by uuid references profiles(id),
  created_at timestamptz default now() not null
);

create index comments_post_id_idx on comments(post_id);

-- Notifications
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  actor_id uuid references profiles(id),
  type notification_type not null,
  title text not null,
  body text not null,
  link text,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

create index notifications_user_id_idx on notifications(user_id, is_read, created_at desc);

-- Moderation log
create table moderation_log (
  id uuid default uuid_generate_v4() primary key,
  moderator_id uuid references profiles(id) not null,
  action moderation_action not null,
  target_type text not null,
  target_id uuid not null,
  reason text,
  created_at timestamptz default now() not null
);

-- Referrals
create table referrals (
  id uuid default uuid_generate_v4() primary key,
  referrer_id uuid references profiles(id) on delete cascade not null,
  referred_email text not null,
  referred_user_id uuid references profiles(id),
  status text default 'pending',
  reward_paid boolean default false,
  created_at timestamptz default now() not null
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table profiles enable row level security;
alter table channels enable row level security;
alter table challenges enable row level security;
alter table challenge_participations enable row level security;
alter table posts enable row level security;
alter table post_reactions enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;
alter table moderation_log enable row level security;
alter table follows enable row level security;
alter table referrals enable row level security;

-- Profiles RLS
create policy "Public profiles viewable by authenticated users"
  on profiles for select to authenticated using (true);
create policy "Users can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- Channels RLS
create policy "Channels viewable by authenticated users"
  on channels for select to authenticated using (not is_archived);
create policy "Only admins can create channels"
  on channels for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Only admins can update channels"
  on channels for update to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Challenges RLS
create policy "Active challenges viewable by authenticated users"
  on challenges for select to authenticated using (is_active = true);
create policy "Admins can manage challenges"
  on challenges for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Posts RLS
create policy "Non-removed posts viewable by authenticated users"
  on posts for select to authenticated using (not is_removed);
create policy "Authenticated users can create posts"
  on posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Authors and mods can update posts"
  on posts for update to authenticated
  using (auth.uid() = author_id or exists (
    select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin')
  ));

-- Comments RLS
create policy "Non-removed comments viewable"
  on comments for select to authenticated using (not is_removed);
create policy "Authenticated users can comment"
  on comments for insert to authenticated with check (auth.uid() = author_id);
create policy "Authors and mods can update comments"
  on comments for update to authenticated
  using (auth.uid() = author_id or exists (
    select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin')
  ));

-- Notifications RLS
create policy "Users can see own notifications"
  on notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users can update own notifications"
  on notifications for update to authenticated using (auth.uid() = user_id);

-- Follows RLS
create policy "Follows viewable by authenticated"
  on follows for select to authenticated using (true);
create policy "Users manage own follows"
  on follows for all to authenticated
  using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- Post reactions RLS
create policy "Reactions viewable by authenticated"
  on post_reactions for select to authenticated using (true);
create policy "Users manage own reactions"
  on post_reactions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Moderation log RLS
create policy "Mods and admins can view log"
  on moderation_log for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin')));
create policy "Mods and admins can insert log"
  on moderation_log for insert to authenticated
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin')));

-- Challenge participations RLS
create policy "Users can view participations"
  on challenge_participations for select to authenticated using (true);
create policy "Users manage own participations"
  on challenge_participations for insert to authenticated with check (auth.uid() = user_id);
create policy "Users and admins can update participations"
  on challenge_participations for update to authenticated
  using (auth.uid() = user_id or exists (
    select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin')
  ));

-- Referrals RLS
create policy "Users can see own referrals"
  on referrals for select to authenticated using (auth.uid() = referrer_id);
create policy "Users can create referrals"
  on referrals for insert to authenticated with check (auth.uid() = referrer_id);

-- =====================
-- FUNCTIONS & TRIGGERS
-- =====================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', lower(replace(split_part(new.email, '@', 1), '.', '_')) || '_' || substr(new.id::text, 1, 4))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Update post reaction count
create or replace function update_reaction_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set reaction_count = reaction_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set reaction_count = reaction_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger on_reaction_change
  after insert or delete on post_reactions
  for each row execute procedure update_reaction_count();

-- Update comment count
create or replace function update_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'UPDATE' and new.is_removed = true and old.is_removed = false then
    update posts set comment_count = comment_count - 1 where id = new.post_id;
  end if;
  return null;
end;
$$;

create trigger on_comment_change
  after insert or update on comments
  for each row execute procedure update_comment_count();

-- Update follower counts
create or replace function update_follow_counts()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update profiles set followers_count = followers_count + 1 where id = new.following_id;
    update profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif tg_op = 'DELETE' then
    update profiles set followers_count = followers_count - 1 where id = old.following_id;
    update profiles set following_count = following_count - 1 where id = old.follower_id;
  end if;
  return null;
end;
$$;

create trigger on_follow_change
  after insert or delete on follows
  for each row execute procedure update_follow_counts();

-- Seed default channels
insert into channels (name, slug, description, icon, tier_required, sort_order) values
  ('General', 'general', 'Main community discussion for all members', 'hash', 'free', 1),
  ('Wins', 'wins', 'Share your victories, big and small', 'trophy', 'core', 2),
  ('Accountability', 'accountability', 'Hold each other accountable to your goals', 'target', 'core', 3),
  ('Resources', 'resources', 'Books, tools, courses and more', 'book-open', 'core', 4),
  ('Hot Seat', 'hot-seat', 'Get direct feedback from the group on your biggest challenges', 'flame', 'elite', 5),
  ('Founders Lounge', 'founders-lounge', 'Exclusive channel for Founding Members', 'crown', 'founding', 6);
