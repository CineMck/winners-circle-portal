-- ============================================================
-- Performance indexes — RUN IN SUPABASE SQL EDITOR. Safe to re-run.
-- ============================================================

-- Leaderboard: the home page sorts all profiles by xp_points on every load.
-- Without this index that's a full sort of the profiles table each time.
create index if not exists idx_profiles_xp_points
  on public.profiles (xp_points desc);

-- Home feed resolves admin/moderator author IDs by filtering profiles.role.
create index if not exists idx_profiles_role
  on public.profiles (role);
