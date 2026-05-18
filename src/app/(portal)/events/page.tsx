import { createClient } from '@/lib/supabase/server';
import EventsPage from './EventsPage';

export default async function Events() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: events } = await supabase
    .from('events')
    .select('*, rsvp_count:event_rsvps(count)')
    .eq('is_published', true)
    .order('starts_at', { ascending: true });

  const { data: myRsvps } = await supabase
    .from('event_rsvps')
    .select('event_id')
    .eq('user_id', user!.id);

  const rsvpSet = new Set((myRsvps || []).map(r => r.event_id));

  return <EventsPage profile={profile} events={events || []} myRsvpIds={[...rsvpSet]} />;
}
