import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EventsPage from './EventsPage';

export default async function Events() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    const { data: events } = await supabase
      .from('events')
      .select('*, rsvp_count:event_rsvps(count)')
      .eq('is_published', true)
      .order('starts_at', { ascending: true });

    const { data: myRsvps } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.id);

    const rsvpSet = new Set((myRsvps || []).map(r => r.event_id));

    return <EventsPage profile={profile} events={events || []} myRsvpIds={[...rsvpSet]} />;
  } catch (err) {
    console.error('EventsPage error:', err);
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Events could not load. Please make sure the database migration has been run.
        </p>
      </div>
    );
  }
}
