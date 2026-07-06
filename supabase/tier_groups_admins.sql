-- Tier-group fix: admins & moderators belong to EVERY tier group.
--
-- Problem: the tier-group sync trigger removed anyone whose tier didn't match
-- the group's tier — including admins. So an Elevate-tier admin who opened
-- (or was added to) the Core group got pruned on their next profile update,
-- and was never added in the first place, which made /messages/<groupId>
-- return 404 (the page requires a conversation_participants row).
--
-- Fix: the trigger now skips role='admin'/'moderator' users when pruning.
-- Staff are added to all tier groups by the /api/admin/tier-groups endpoint
-- (re-run by clicking any tier-group button in Messages → New Group).
--
-- Run AFTER tier_groups.sql. Also note: the Base tier group works out of the
-- box — the trigger matches conversations.tier by text, so once the
-- "Base Members" group exists, base members are auto-added/removed.

create or replace function sync_tier_group_membership()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') or (new.tier is distinct from old.tier) then
    -- Remove them from any tier group that no longer matches their tier —
    -- UNLESS they're an admin/moderator (staff stay in all tier groups).
    if new.role is null or new.role not in ('admin', 'moderator') then
      delete from conversation_participants cp
      using conversations c
      where cp.conversation_id = c.id
        and c.tier is not null
        and c.tier is distinct from new.tier::text
        and cp.user_id = new.id;
    end if;

    -- Add them to the group for their current tier, if one exists.
    insert into conversation_participants (conversation_id, user_id)
    select c.id, new.id from conversations c
    where c.tier = new.tier::text
    on conflict (conversation_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Backfill: add all current admins/moderators to every existing tier group.
insert into conversation_participants (conversation_id, user_id)
select c.id, p.id
from conversations c
cross join profiles p
where c.tier is not null
  and p.role in ('admin', 'moderator')
on conflict (conversation_id, user_id) do nothing;
