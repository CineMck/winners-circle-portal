-- ============================================================
-- FIX: admin "Save" on a member's tier fails with
--   "operator does not exist: text = member_tier"
--
-- Cause: sync_tier_group_membership() (trg_sync_tier_group on profiles,
-- from tier_groups.sql) compares conversations.tier (text) to
-- profiles.tier (member_tier enum). Postgres has no text = member_tier
-- operator, so the UPDATE aborts. Cast the enum to text.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================

create or replace function sync_tier_group_membership()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') or (new.tier is distinct from old.tier) then
    -- Remove them from any tier group that no longer matches their tier.
    delete from conversation_participants cp
    using conversations c
    where cp.conversation_id = c.id
      and c.tier is not null
      and c.tier is distinct from new.tier::text
      and cp.user_id = new.id;

    -- Add them to the group for their current tier, if one exists.
    insert into conversation_participants (conversation_id, user_id)
    select c.id, new.id from conversations c
    where c.tier = new.tier::text
    on conflict (conversation_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
