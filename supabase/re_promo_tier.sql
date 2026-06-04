-- Adds the "Real Estate Promo" tier to the member_tier enum.
-- Used for Elevate Real Estate Mastermind promo attendees: they can be
-- assigned this tier from the admin Members page, and events can be
-- restricted to "Real Estate Promo Only".
--
-- Run this once in the Supabase SQL editor (run it by itself — adding an
-- enum value can't run inside a transaction with other statements).

alter type member_tier add value if not exists 're_promo';
