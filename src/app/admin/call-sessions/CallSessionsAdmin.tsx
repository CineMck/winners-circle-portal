'use client';
import { useState } from 'react';

interface Session {
  id: string;
  label: string;
  starts_at: string;
  zoom_url: string | null;
  is_active: boolean;
}

function toLocalInput(iso: string): string {
  // Convert ISO → value for <input type="datetime-local"> (local time).
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

const input: React.CSSProperties = {
  width: '100%', background: '#161616', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 14, outline: 'none',
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' };

export default function CallSessionsAdmin({ initial }: { initial: Session[] }) {
  const [sessions, setSessions] = useState<Session[]>(initial);
  const [label, setLabel] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function addSession(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !startsAt) { setError('Label and start time are required.'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/admin/call-sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.trim(), starts_at: new Date(startsAt).toISOString(), zoom_url: zoomUrl.trim() || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Failed to add.'); return; }
    setSessions(prev => [data.session, ...prev]);
    setLabel(''); setStartsAt(''); setZoomUrl('');
  }

  async function toggleActive(s: Session) {
    const res = await fetch('/api/admin/call-sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
    });
    if (res.ok) setSessions(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function remove(s: Session) {
    if (!confirm('Delete this call session?')) return;
    const res = await fetch('/api/admin/call-sessions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }),
    });
    if (res.ok) setSessions(prev => prev.filter(x => x.id !== s.id));
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 40px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Call Sessions</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
        Manage Elevate RE Mastermind Zoom calls. These power the registration form, confirmation emails, and reminders.
      </p>

      <form onSubmit={addSession} className="card" style={{ padding: 18, marginBottom: 24, display: 'grid', gap: 12 }}>
        <div>
          <label style={labelStyle}>Label (shown to registrants)</label>
          <input style={input} value={label} onChange={e => setLabel(e.target.value)} placeholder="Wednesday, June 17 · 12:00pm ET" />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Start date &amp; time</label>
            <input style={input} type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={labelStyle}>Zoom link</label>
            <input style={input} value={zoomUrl} onChange={e => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/…" />
          </div>
        </div>
        {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
        <div><button type="submit" disabled={saving} className="btn-gold" style={{ padding: '9px 20px', fontSize: 14 }}>{saving ? 'Adding…' : 'Add call session'}</button></div>
      </form>

      <div style={{ display: 'grid', gap: 10 }}>
        {sessions.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>No call sessions yet.</p>}
        {sessions.map(s => (
          <div key={s.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, opacity: s.is_active ? 1 : 0.55 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmt(s.starts_at)}{s.zoom_url ? ' · Zoom link set' : ' · no Zoom link'}</div>
            </div>
            <button onClick={() => toggleActive(s)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
              {s.is_active ? 'Active' : 'Inactive'}
            </button>
            <button onClick={() => remove(s)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
