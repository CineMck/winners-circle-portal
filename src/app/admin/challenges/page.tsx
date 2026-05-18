import { createClient } from '@/lib/supabase/server';
import ChallengesAdmin from './ChallengesAdmin';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });
  return <ChallengesAdmin challenges={challenges || []} adminId={user!.id} />;
}
