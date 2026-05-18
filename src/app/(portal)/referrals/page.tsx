import { createClient } from '@/lib/supabase/server';
import ReferralsPage from './ReferralsPage';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: referrals } = await supabase
    .from('referrals')
    .select('*, referred_user:profiles!referred_user_id(full_name, tier)')
    .eq('referrer_id', user!.id)
    .order('created_at', { ascending: false });

  return <ReferralsPage profile={profile} referrals={referrals || []} />;
}
