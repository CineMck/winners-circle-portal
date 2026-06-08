'use client';
import { useMemo, useState } from 'react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  brokerage: string;
  call_date: string | null;
  created_at: string;
  unsubscribed: boolean;
}

export default function LeadsAdmin({ rows }: { rows: Lead[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      `${r.first_name} ${r.last_name} ${r.email} ${r.brokerage}`.toLowerCase().includes(t)
    );
  }, [rows, q]);

  function exportCsv() {
    const header = ['First name', 'Last name', 'Email', 'Phone', 'Brokerage', 'Call date', 'Registered', 'Unsubscribed'];
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(',')];
    for (const r of filtered) {
      lines.push([r.first_name, r.last_name, r.email, r.phone, r.brokerage, r.call_date || '', new Date(r.created_at).toISOString(), r.unsubscribed ? 'yes' : 'no'].map(esc).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `re-mastermind-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeCount = rows.filter(r => !r.unsubscribed).length;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 0 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Real Estate Marketing List</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{rows.length} registrations · {activeCount} subscribed</p>
        </div>
        <button onClick={exportCsv} className="btn-gold" style={{ padding: '8px 16px', fontSize: 13 }}>⬇ Export CSV</button>
      </div>

      <input
        value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search name, email, or brokerage…"
        style={{ width: '100%', background: '#161616', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', marginBottom: 16 }}
      />

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 12px' }}>Name</th>
              <th style={{ padding: '10px 12px' }}>Email</th>
              <th style={{ padding: '10px 12px' }}>Phone</th>
              <th style={{ padding: '10px 12px' }}>Brokerage</th>
              <th style={{ padding: '10px 12px' }}>Call</th>
              <th style={{ padding: '10px 12px' }}>Registered</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No registrations.</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle, #161616)', opacity: r.unsubscribed ? 0.5 : 1 }}>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  {r.first_name} {r.last_name}
                  {r.unsubscribed && <span style={{ marginLeft: 6, fontSize: 10, color: '#ef4444', border: '1px solid #ef4444', borderRadius: 4, padding: '1px 4px' }}>unsub</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>{r.email}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{r.phone}</td>
                <td style={{ padding: '10px 12px' }}>{r.brokerage}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{r.call_date || '—'}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
