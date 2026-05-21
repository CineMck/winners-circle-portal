import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MemberDetailView from './MemberDetailView';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch full profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) notFound();

  // Fetch last login from auth
  let lastLogin: string | null = null;
  try {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const authUser = users.find(u => u.id === id);
    lastLogin = authUser?.last_sign_in_at || null;
  } catch { /* ignore */ }

  // Fetch referrals this member has made
  const { data: referrals } = await supabaseAdmin
    .from('referrals')
    .select(`
      id, referred_email, status, created_at,
      referred_user:profiles!referrals_referred_user_id_fkey(full_name, email, tier, avatar_url)
    `)
    .eq('referrer_id', id)
    .order('created_at', { ascending: false });

  return (
    <MemberDetailView
      profile={profile}
      lastLogin={lastLogin}
      referrals={referrals || []}
    />
  );
}
