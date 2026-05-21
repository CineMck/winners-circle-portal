import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import AdminShell from '../AdminShell';
import AgentDashboard from './AgentDashboard';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function AgentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !['admin', 'moderator'].includes(profile.role)) redirect('/home');

  // Fetch the 10 most recent reports
  const { data: reports } = await supabaseAdmin
    .from('agent_reports')
    .select('id, generated_at, summary_text, suggested_outreach, command_log, status, sent_at, metadata')
    .order('generated_at', { ascending: false })
    .limit(10);

  // Get all member profiles for resolving names/avatars
  const { data: members } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url, tier, username')
    .order('full_name');

  return (
    <AdminShell profile={profile}>
      <AgentDashboard
        initialReports={(reports || []) as never}
        members={members || []}
        cronSecret={process.env.AGENT_CRON_SECRET || ''}
      />
    </AdminShell>
  );
}
