-- Ghost authoring (July 2026)
-- Lets admins publish feed posts and send DMs under John Wentworth's account
-- while keeping a private audit trail of which admin actually wrote it.
--
-- Members never see these columns (they aren't selected by the app). They are
-- written only by the service-role ghost routes (/api/admin/ghost/*), so no
-- RLS INSERT policy change is needed — the member-facing insert policies are
-- untouched and continue to require auth.uid() = author_id / sender_id.

-- Feed posts: which admin ghost-authored this post as John (NULL = normal post).
alter table posts
  add column if not exists ghost_authored_by uuid references profiles(id) on delete set null;

-- DMs: which admin ghost-sent this message as John (NULL = normal message).
alter table messages
  add column if not exists ghost_sent_by uuid references profiles(id) on delete set null;

-- Indexes so the audit trail is queryable ("show everything admin X sent as John").
create index if not exists posts_ghost_authored_by_idx on posts(ghost_authored_by) where ghost_authored_by is not null;
create index if not exists messages_ghost_sent_by_idx on messages(ghost_sent_by) where ghost_sent_by is not null;

comment on column posts.ghost_authored_by is 'Admin who published this post under John''s account (audit only; never shown to members).';
comment on column messages.ghost_sent_by is 'Admin who sent this DM under John''s account (audit only; never shown to members).';
