-- Group DMs: adds group metadata to conversations.
-- Existing 1:1 conversations are untouched (is_group defaults to false).
-- Run this once in the Supabase SQL editor.

alter table conversations
  add column if not exists is_group boolean not null default false,
  add column if not exists name text,
  add column if not exists created_by uuid references profiles(id) on delete set null;
