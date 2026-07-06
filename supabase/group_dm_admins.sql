-- All group DMs are visible to all admins & moderators.
-- (1-on-1 DMs stay private — this only touches is_group = true conversations.)
--
-- Three parts:
--   1. Trigger: any newly created group conversation automatically gets all
--      current admins/moderators as participants.
--   2. Trigger: when someone is promoted to admin/moderator, they're added to
--      every existing group conversation.
--   3. Backfill: add all current staff to all existing group conversations.
--
-- Run AFTER tier_groups_admins.sql. Safe to re-run.
-- Note: staff become real participants, so group chats appear in their inbox
-- and they receive unread badges/notifications for them.

-- 1. New group conversations include all staff.
create or replace function add_staff_to_group_conversation()
returns trigger language plpgsql security definer as $fn$
begin
  if new.is_group then
    insert into conversation_participants (conversation_id, user_id)
    select new.id, p.id from profiles p
    where p.role in ('admin', 'moderator')
    on conflict (conversation_id, user_id) do nothing;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_add_staff_to_group on conversations;
create trigger trg_add_staff_to_group
  after insert on conversations
  for each row execute function add_staff_to_group_conversation();

-- 2. Newly promoted staff join all existing group conversations.
create or replace function add_new_staff_to_groups()
returns trigger language plpgsql security definer as $fn$
begin
  if new.role in ('admin', 'moderator')
     and (old.role is null or old.role not in ('admin', 'moderator')) then
    insert into conversation_participants (conversation_id, user_id)
    select c.id, new.id from conversations c
    where c.is_group = true
    on conflict (conversation_id, user_id) do nothing;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_add_new_staff_to_groups on profiles;
create trigger trg_add_new_staff_to_groups
  after update of role on profiles
  for each row execute function add_new_staff_to_groups();

-- 3. Backfill: all current staff into all existing group conversations.
insert into conversation_participants (conversation_id, user_id)
select c.id, p.id
from conversations c
cross join profiles p
where c.is_group = true
  and p.role in ('admin', 'moderator')
on conflict (conversation_id, user_id) do nothing;
