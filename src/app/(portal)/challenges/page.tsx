import { createClient } from '@/lib/supabase/server';
import ChallengesPage from './ChallengesPage';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*, participations:challenge_participations(count)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Get user's participations
  const { data: userParticipations } = await supabase
    .from('challenge_participations')
    .select('*')
    .eq('user_id', user!.id);

  // Get user's checkin counts per challenge (for progress bars)
  const { data: checkinCounts } = await supabase
    .from('challenge_checkins')
    .select('challenge_id')
    .eq('user_id', user!.id);

  // Build a map of challenge_id -> checkin count
  const checkinMap: Record<string, number> = {};
  (checkinCounts || []).forEach(row => {
    checkinMap[row.challenge_id] = (checkinMap[row.challenge_id] || 0) + 1;
  });

  return <ChallengesPage profile={profile} challenges={challenges || []} userParticipations={userParticipations || []} checkinCounts={checkinMap} />;
}
