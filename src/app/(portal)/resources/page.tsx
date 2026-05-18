import { createClient } from '@/lib/supabase/server';
import ResourcesPage from './ResourcesPage';

export default async function Resources() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const { data: categories } = await supabase.from('resource_categories').select('*').order('sort_order');
  const { data: resources } = await supabase
    .from('resources')
    .select('*, category:resource_categories(name)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  return <ResourcesPage profile={profile} categories={categories || []} resources={resources || []} />;
}
