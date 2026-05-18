import { createClient } from '@/lib/supabase/server';
import ChannelsAdmin from './ChannelsAdmin';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: channels } = await supabase.from('channels').select('*').order('sort_order');
  return <ChannelsAdmin channels={channels || []} adminId={user!.id} />;
}
