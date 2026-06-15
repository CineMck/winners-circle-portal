-- Adds an opt-out flag so a course can skip the "Course Introduction" section
-- (e.g. single-video courses). The viewer hides the intro and opens straight to
-- the first lesson when true. Defaults false, so existing courses are unchanged.

alter table public.courses
  add column if not exists hide_intro boolean not null default false;
