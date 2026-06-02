-- Allow authenticated users to upload to the `media` bucket from the client.
-- Path convention: <folder>/<userId>/<filename>
-- We verify the path starts with the caller's auth.uid() so users can only
-- write into their own folder.
--
-- Run in Supabase SQL Editor.

-- 1. Make sure the bucket exists and is public (read-only).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- 2. Anyone can read public media (already true if bucket public, but be explicit).
drop policy if exists "Public read" on storage.objects;
create policy "Public read"
  on storage.objects for select
  using ( bucket_id = 'media' );

-- 3. Authenticated users can insert ONLY into folders prefixed with their own UID.
--    path layout: <folder>/<userId>/<filename>  →  split_part(name, '/', 2) = userId
drop policy if exists "Users upload to own folder" on storage.objects;
create policy "Users upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and split_part(name, '/', 2) = auth.uid()::text
  );

-- 4. Authenticated users can update/replace their own uploads.
drop policy if exists "Users update own files" on storage.objects;
create policy "Users update own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and split_part(name, '/', 2) = auth.uid()::text
  );

-- 5. Authenticated users can delete their own uploads.
drop policy if exists "Users delete own files" on storage.objects;
create policy "Users delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and split_part(name, '/', 2) = auth.uid()::text
  );
