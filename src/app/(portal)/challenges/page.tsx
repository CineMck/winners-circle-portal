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

  return <ChallengesPage profile={profile} challenges={challenges || []} userParticipations={userParticipations || []} />;
}
