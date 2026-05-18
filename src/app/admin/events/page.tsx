import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EventsAdmin from './EventsAdmin';

export default async function EventsAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'moderator'].includes(profile.role)) redirect('/home');

  const { data: events } = await supabase
    .from('events')
    .select('*, rsvp_count:event_rsvps(count)')
    .order('starts_at', { ascending: false });

  return <EventsAdmin events={events || []} adminId={user.id} />;
}
