-- Add reminder_sent_at to events for idempotent push reminders.
-- Only run if your events table doesn't already have this column.

alter table events
  add column if not exists reminder_sent_at timestamptz null;

create index if not exists events_starts_at_idx on events(starts_at);
