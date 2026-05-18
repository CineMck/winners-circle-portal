import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PortalShell from '@/components/layout/PortalShell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order');

  return (
    <PortalShell profile={profile} channels={channels || []}>
      {children}
    </PortalShell>
  );
}
