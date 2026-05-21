import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: totalMembers },
    { count: coreMembers },
    { count: eliteMembers },
    { count: foundingMembers },
    { count: totalPosts },
    { count: activeChallenges },
    { data: recentMembers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'core'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'elite'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('tier', 'founding'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_removed', false),
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('id, full_name, tier, email, created_at').order('created_at', { ascending: false }).limit(10),
  ]);

  // Fetch last_sign_in_at from auth.users for recent members
  const lastLoginMap: Record<string, string | null> = {};
  if (recentMembers && recentMembers.length > 0) {
    try {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      const memberIds = new Set((recentMembers).map((m: { id: string }) => m.id));
      for (const u of users) {
        if (memberIds.has(u.id)) {
          lastLoginMap[u.id] = u.last_sign_in_at || null;
        }
      }
    } catch {
      // If we can't fetch last login, just show dashes
    }
  }

  const metrics = [
    { label: 'Total Members', value: totalMembers || 0, icon: '👥', color: 'var(--gold)' },
    { label: 'Core Members', value: coreMembers || 0, icon: '⚡', color: '#c9a84c' },
    { label: 'Elite Members', value: eliteMembers || 0, icon: '💎', color: '#e0c068' },
    { label: 'Founding Members', value: foundingMembers || 0, icon: '👑', color: '#ffd700' },
    { label: 'Total Posts', value: totalPosts || 0, icon: '💬', color: '#60a5fa' },
    { label: 'Active Challenges', value: activeChallenges || 0, icon: '🎯', color: '#22c55e' },
  ];

  function formatLastLogin(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString();
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>📊 Admin Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: 'var(--black-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '20px',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{m.icon}</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Recent members */}
      <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Recent Members</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Email', 'Tier', 'Joined', 'Last Login'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(recentMembers || []).map((m: { id: string; full_name: string; email: string; tier: string; created_at: string }) => (
              <tr key={m.id}>
                <td style={{ padding: '10px 12px', fontSize: '14px' }}>{m.full_name}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--muted)' }}>{m.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', border: '1px solid var(--gold)', padding: '2px 8px', borderRadius: '20px' }}>{m.tier}</span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--muted)' }}>
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: lastLoginMap[m.id] ? 'var(--text)' : 'var(--muted)' }}>
                  {formatLastLogin(lastLoginMap[m.id])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
