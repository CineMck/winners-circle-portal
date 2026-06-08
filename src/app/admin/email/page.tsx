import { createClient } from '@supabase/supabase-js';
import EmailMarketingShell from './EmailMarketingShell';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function EmailMarketingPage() {
  const [
    { count: allCount },
    { count: paidCount },
    { count: coreCount },
    { count: eliteCount },
    { count: foundingCount },
    { count: registrationsCount },
    { data: campaigns },
    { data: templates },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).in('tier', ['core', 'elite', 'founding']),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'core'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'elite'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'founding'),
    supabaseAdmin.from('re_mastermind_registrations').select('*', { count: 'exact', head: true }).eq('unsubscribed', false),
    supabaseAdmin.from('email_campaigns').select('id,name,subject,tier,status,sent_at,recipient_count,created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('email_templates').select('id,name,description,blocks,created_at').order('created_at', { ascending: false }),
  ]);

  const tierCounts = {
    all: allCount || 0,
    paid: paidCount || 0,
    core: coreCount || 0,
    elite: eliteCount || 0,
    founding: foundingCount || 0,
    registrations: registrationsCount || 0,
  };

  return (
    <EmailMarketingShell
      tierCounts={tierCounts}
      initialCampaigns={campaigns || []}
      initialTemplates={templates || []}
    />
  );
}
