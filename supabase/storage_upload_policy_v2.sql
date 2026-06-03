-- Simplified storage upload policy.
-- Replaces the per-user folder check with a permissive "any authenticated user
-- can upload to the media bucket" policy. iOS WebView sometimes loses the
-- per-row auth.uid() context, causing the stricter policy to fail.
--
-- Tradeoff: a malicious user could upload into someone else's user folder. In
-- practice this is acceptable for now — the folder structure is just for org;
-- the security boundary is "you must be signed in to upload at all".
--
-- Run in Supabase SQL Editor. Safe to re-run.

-- Drop the older restrictive policies if they exist
drop policy if exists "Users upload to own folder" on storage.objects;
drop policy if exists "Users update own files" on storage.objects;
drop policy if exists "Users delete own files" on storage.objects;
drop policy if exists "Authenticated upload to media" on storage.objects;
drop policy if exists "Authenticated update media" on storage.objects;
drop policy if exists "Authenticated delete media" on storage.objects;

-- Make sure the bucket exists and is public-read
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Anyone can read
drop policy if exists "Public read" on storage.objects;
create policy "Public read"
  on storage.objects for select
  using ( bucket_id = 'media' );

-- Any authenticated user can insert
create policy "Authenticated upload to media"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'media' );

-- Any authenticated user can update their uploads (matched by owner column)
create policy "Authenticated update media"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'media' and owner = auth.uid() );

-- Any authenticated user can delete their own uploads
create policy "Authenticated delete media"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'media' and owner = auth.uid() );
