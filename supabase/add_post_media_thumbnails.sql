-- Adds per-video poster images for feed posts.
-- media_thumbnails is parallel to posts.media_urls by index:
--   media_thumbnails[i] is the poster URL for media_urls[i]
--   (empty string '' for images or videos without a generated thumbnail).
--
-- Run in the Supabase SQL Editor BEFORE deploying the thumbnail feature,
-- otherwise PostComposer inserts will fail on the missing column.

alter table public.posts
  add column if not exists media_thumbnails text[] not null default '{}';
