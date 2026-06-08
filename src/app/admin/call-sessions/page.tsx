import { createAdminClient } from '@/lib/supabase/admin';
import CallSessionsAdmin from './CallSessionsAdmin';

export const dynamic = 'force-dynamic';

export default async function CallSessionsPage() {
  const { data } = await createAdminClient()
    .from('re_call_sessions')
    .select('*')
    .order('starts_at', { ascending: false });
  return <CallSessionsAdmin initial={data || []} />;
}
