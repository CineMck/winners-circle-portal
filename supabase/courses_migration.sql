-- ============================================================
-- Winners Circle: Courses Feature Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. COURSES TABLE
create table if not exists courses (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text unique not null,
  description     text,
  intro_video_url text,
  thumbnail_url   text,
  tier_required   text not null default 'free',
  is_published    boolean not null default false,
  sort_order      int not null default 0,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2. COURSE LESSONS TABLE
create table if not exists course_lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references courses(id) on delete cascade,
  title            text not null,
  description      text,
  video_url        text,
  duration_seconds int,
  sort_order       int not null default 0,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now()
);

-- 3. COURSE PROGRESS TABLE (tracks which lessons each user has completed)
create table if not exists course_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  lesson_id    uuid not null references course_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

-- 4. INDEXES
create index if not exists idx_course_lessons_course_id on course_lessons(course_id);
create index if not exists idx_course_progress_user_id  on course_progress(user_id);
create index if not exists idx_course_progress_lesson_id on course_progress(lesson_id);

-- 5. ROW LEVEL SECURITY
alter table courses enable row level security;
alter table course_lessons enable row level security;
alter table course_progress enable row level security;

-- Courses: all authenticated users can read published courses; admins can do everything
create policy "Authenticated users read published courses"
  on courses for select
  using (auth.uid() is not null and is_published = true);

create policy "Admins manage all courses"
  on courses for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
  );

-- Lessons: all authenticated users can read lessons of published courses; admins full access
create policy "Authenticated users read lessons of published courses"
  on course_lessons for select
  using (
    auth.uid() is not null and
    exists (select 1 from courses where id = course_lessons.course_id and is_published = true)
  );

create policy "Admins manage all lessons"
  on course_lessons for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'moderator'))
  );

-- Progress: users manage their own records only
create policy "Users manage own progress"
  on course_progress for all
  using (auth.uid() = user_id);

-- 6. STORAGE BUCKET (for course videos / thumbnails)
-- The existing 'media' bucket can be reused, or create a separate one.
-- Add this policy to allow uploads to the media bucket under 'courses/' prefix
-- (skip if the media bucket already has permissive policies)

-- insert into storage.buckets (id, name, public) values ('courses', 'courses', true)
-- on conflict do nothing;

-- create policy "Authenticated users can upload course media"
--   on storage.objects for insert
--   with check (bucket_id = 'courses' and auth.uid() is not null);

-- create policy "Course media is publicly readable"
--   on storage.objects for select
--   using (bucket_id = 'courses');
