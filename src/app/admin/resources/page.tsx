import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ResourcesAdmin from './ResourcesAdmin';

export default async function ResourcesAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'moderator'].includes(profile.role)) redirect('/home');

  const { data: categories } = await supabase.from('resource_categories').select('*').order('sort_order');
  const { data: resources } = await supabase
    .from('resources')
    .select('*, category:resource_categories(name)')
    .order('created_at', { ascending: false });

  return <ResourcesAdmin categories={categories || []} resources={resources || []} adminId={user.id} />;
}
