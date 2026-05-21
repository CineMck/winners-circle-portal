import EmailComposer from './EmailComposer';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function EmailMarketingPage() {
  // Get member counts per tier for the recipient selector
  const [
    { count: allCount },
    { count: paidCount },
    { count: coreCount },
    { count: eliteCount },
    { count: foundingCount },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).in('tier', ['core', 'elite', 'founding']),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'core'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'elite'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'founding'),
  ]);

  const tierCounts = {
    all: allCount || 0,
    paid: paidCount || 0,
    core: coreCount || 0,
    elite: eliteCount || 0,
    founding: foundingCount || 0,
  };

  return <EmailComposer tierCounts={tierCounts} />;
}
