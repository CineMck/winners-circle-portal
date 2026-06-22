-- Tier message groups: a group conversation tied to a membership tier.
-- Membership is kept in sync automatically — when a member's tier changes
-- (via Stripe, admin edit, or import), a trigger adds them to their tier's
-- group and removes them from any other tier group. Run once in Supabase.

alter table conversations add column if not exists tier text;
create index if not exists idx_conversations_tier on conversations(tier) where tier is not null;

-- Keep each member in exactly the group that matches their current tier.
create or replace function sync_tier_group_membership()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') or (new.tier is distinct from old.tier) then
    -- Remove them from any tier group that no longer matches their tier
    -- (this is what drops a member from a group when they downgrade).
    -- conversations.tier is text; profiles.tier is the member_tier enum, so
    -- cast the enum to text before comparing (no text = member_tier operator).
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

drop trigger if exists trg_sync_tier_group on profiles;
create trigger trg_sync_tier_group
  after insert or update of tier on profiles
  for each row execute function sync_tier_group_membership();
