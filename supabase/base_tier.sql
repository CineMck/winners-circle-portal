-- Adds the "Base" tier ($50/mo plan, sold at $19.95/mo promo with a free
-- 30-day trial) to the member_tier enum.
--
-- Run this in the Supabase SQL editor BEFORE deploying the Base plan code:
-- profiles.tier is a member_tier enum, so the webhook/admin updates will fail
-- with "invalid input value for enum" until this value exists.
--
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
-- older Postgres versions. Run it as a standalone statement.

ALTER TYPE member_tier ADD VALUE IF NOT EXISTS 'base';
