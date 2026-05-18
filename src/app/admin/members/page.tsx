import { createClient } from '@/lib/supabase/server';
import MembersAdmin from './MembersAdmin';

export default async function Page() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return <MembersAdmin initialMembers={members || []} />;
}
