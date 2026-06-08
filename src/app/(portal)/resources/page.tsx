import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ResourcesPage from './ResourcesPage';

// Auth-gated, reads cookies per request — never statically prerender.
// (The try/catch below would otherwise swallow Next's dynamic-render signal.)
export const dynamic = 'force-dynamic';

export default async function Resources() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    const { data: categories } = await supabase.from('resource_categories').select('*').order('sort_order');
    const { data: resources } = await supabase
      .from('resources')
      .select('*, category:resource_categories(name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    return <ResourcesPage profile={profile} categories={categories || []} resources={resources || []} />;
  } catch (err) {
    console.error('ResourcesPage error:', err);
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Resources could not load. Please make sure the database migration has been run.
        </p>
      </div>
    );
  }
}
