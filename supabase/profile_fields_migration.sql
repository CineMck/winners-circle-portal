-- ============================================================
-- Winners Circle: Extended Profile Fields
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS goals_12_months TEXT,
  ADD COLUMN IF NOT EXISTS goals_30_days TEXT;
