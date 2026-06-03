-- Granular access groups.
--
-- Adds an `access_group` column to tables that gate content by membership.
-- Values: 'all' | 'paid' | 'elevate' | 'one_on_one'
--   all         — Free + every paid tier
--   paid        — Core + Elevate + 1-1 Elite
--   elevate     — Elevate + 1-1 Elite
--   one_on_one  — 1-1 Elite only
--
-- The existing `tier_required` column stays for backward compatibility; new code
-- should check `access_group`. The trigger below keeps the two in sync so older
-- code that still reads tier_required keeps working.
--
-- Safe to re-run.

-- 1. Map legacy tier → access_group
create or replace function tier_to_access_group(t text)
  returns text
  language sql immutable as $$
  select case t
    when 'free'     then 'all'
    when 'core'     then 'paid'
    when 'elite'    then 'elevate'
    when 'founding' then 'one_on_one'
    else 'all'
  end;
$$;

-- 2. Add access_group to each tier-gated table
do $$
declare
  tbl text;
  tables text[] := array['channels', 'challenges', 'courses', 'events', 'resources'];
begin
  foreach tbl in array tables
  loop
    -- skip if the table doesn't exist (resources/events may be in features_migration)
    if to_regclass('public.' || tbl) is null then
      raise notice 'Skipping % (table does not exist)', tbl;
      continue;
    end if;

    -- Add column if missing
    execute format(
      'alter table %I add column if not exists access_group text not null default ''all''',
      tbl
    );

    -- Add check constraint (drop first so re-runs are clean)
    execute format(
      'alter table %I drop constraint if exists %I',
      tbl, tbl || '_access_group_check'
    );
    execute format(
      'alter table %I add constraint %I check (access_group in (''all'', ''paid'', ''elevate'', ''one_on_one''))',
      tbl, tbl || '_access_group_check'
    );

    -- Backfill from existing tier_required (only if access_group is still default)
    execute format(
      'update %I set access_group = tier_to_access_group(tier_required::text) where access_group = ''all'' and tier_required is not null',
      tbl
    );
  end loop;
end;
$$;

-- 3. Helpful index for membership-level filters
create index if not exists channels_access_group_idx   on channels(access_group);
create index if not exists challenges_access_group_idx on challenges(access_group);
-- courses/events/resources skipped if table absent (won't error since the index uses if not exists)
do $$ begin
  if to_regclass('public.courses')   is not null then execute 'create index if not exists courses_access_group_idx   on courses(access_group)'; end if;
  if to_regclass('public.events')    is not null then execute 'create index if not exists events_access_group_idx    on events(access_group)'; end if;
  if to_regclass('public.resources') is not null then execute 'create index if not exists resources_access_group_idx on resources(access_group)'; end if;
end $$;
