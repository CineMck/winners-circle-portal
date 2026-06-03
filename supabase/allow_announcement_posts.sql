-- Allow admin announcement posts that aren't tied to a channel or challenge.
-- The Home page composer renders an "Announcement to all members" box
-- (visible only to admins/moderators) and inserts posts with channel_id = null,
-- challenge_id = null. The existing check constraint forbade that.
--
-- HomeFeed filters by `author_id in (admins)` so untyped posts only show up
-- as admin announcements on the home page. Channel pages still scope to a
-- channel and won't show them.

alter table posts drop constraint if exists posts_check;
