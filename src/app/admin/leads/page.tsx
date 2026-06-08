import { createAdminClient } from '@/lib/supabase/admin';
import LeadsAdmin from './LeadsAdmin';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const { data } = await createAdminClient()
    .from('re_mastermind_registrations')
    .select('id, first_name, last_name, email, phone, brokerage, call_date, created_at, unsubscribed')
    .order('created_at', { ascending: false });
  return <LeadsAdmin rows={data || []} />;
}
