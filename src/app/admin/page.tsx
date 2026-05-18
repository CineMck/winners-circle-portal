import { createClient } from '@/lib/supabase/server';

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
    supabase.from('profiles').select('id, full_name, tier, email, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  const metrics = [
    { label: 'Total Members', value: totalMembers || 0, icon: '👥', color: 'var(--gold)' },
    { label: 'Core Members', value: coreMembers || 0, icon: '⚡', color: '#c9a84c' },
    { label: 'Elite Members', value: eliteMembers || 0, icon: '💎', color: '#e0c068' },
    { label: 'Founding Members', value: foundingMembers || 0, icon: '👑', color: '#ffd700' },
    { label: 'Total Posts', value: totalPosts || 0, icon: '💬', color: '#60a5fa' },
    { label: 'Active Challenges', value: activeChallenges || 0, icon: '🎯', color: '#22c55e' },
  ];

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
              {['Name', 'Email', 'Tier', 'Joined'].map(h => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
