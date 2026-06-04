'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Event {
  id: string; title: string; description?: string; zoom_link?: string;
  recording_url?: string; starts_at: string; duration_minutes: number;
  tier_required: string; is_published: boolean; created_at: string;
  rsvp_count?: { count: number }[];
}

const inputStyle: React.CSSProperties = { width: '100%', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' };

const emptyForm = { title: '', description: '', zoom_link: '', recording_url: '', starts_at: '', duration_minutes: 60, tier_required: 'free', is_published: false };

export default function EventsAdmin({ events: initial, adminId }: { events: Event[]; adminId: string }) {
  const [events, setEvents] = useState<Event[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  function openCreate() { setForm(emptyForm); setEditId(null); setShowForm(true); }
  function openEdit(ev: Event) {
    setForm({ title: ev.title, description: ev.description || '', zoom_link: ev.zoom_link || '', recording_url: ev.recording_url || '', starts_at: ev.starts_at ? ev.starts_at.slice(0, 16) : '', duration_minutes: ev.duration_minutes, tier_required: ev.tier_required, is_published: ev.is_published });
    setEditId(ev.id); setShowForm(true);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, starts_at: new Date(form.starts_at).toISOString(), created_by: adminId };
    if (editId) {
      const { data } = await supabase.from('events').update(payload).eq('id', editId).select('*').single();
      if (data) setEvents(prev => prev.map(ev => ev.id === editId ? { ...ev, ...data } : ev));
    } else {
      const { data } = await supabase.from('events').insert(payload).select('*').single();
      if (data) setEvents(prev => [data, ...prev]);
    }
    setSaving(false); setShowForm(false); setEditId(null);
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(ev => ev.id !== id));
  }

  async function togglePublish(ev: Event) {
    await supabase.from('events').update({ is_published: !ev.is_published }).eq('id', ev.id);
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_published: !ev.is_published } : e));
  }

  const upcoming = events.filter(e => new Date(e.starts_at) >= new Date());
  const past = events.filter(e => new Date(e.starts_at) < new Date());

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>📅 Events</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>{upcoming.length} upcoming · {past.length} past</p>
        </div>
        <button onClick={openCreate} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>+ New Event</button>
      </div>

      {showForm && (
        <div style={{ background: '#111', border: '1px solid #c9a84c', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ margin: '0 0 20px', color: '#c9a84c', fontSize: '15px', fontWeight: 700 }}>{editId ? 'Edit Event' : 'New Event'}</h3>
          <form onSubmit={saveEvent} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="Weekly Hot Seat Call" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What's this session about…" />
            </div>
            <div>
              <label style={labelStyle}>Date & Time *</label>
              <input type="datetime-local" style={inputStyle} value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Duration (minutes)</label>
              <input type="number" style={inputStyle} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} min={15} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Zoom Join Link</label>
              <input style={inputStyle} value={form.zoom_link} onChange={e => setForm({ ...form, zoom_link: e.target.value })} placeholder="https://zoom.us/j/..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Recording URL (after the session)</label>
              <input style={inputStyle} value={form.recording_url} onChange={e => setForm({ ...form, recording_url: e.target.value })} placeholder="https://zoom.us/rec/... or YouTube link" />
            </div>
            <div>
              <label style={labelStyle}>Tier Required</label>
              <select style={inputStyle} value={form.tier_required} onChange={e => setForm({ ...form, tier_required: e.target.value })}>
                <option value="free">Free (all members)</option>
                <option value="core">Core</option>
                <option value="elite">Elevate</option>
                <option value="founding">1-1 Elite</option>
                <option value="re_promo">Real Estate Promo Only</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
              <input type="checkbox" id="pub" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} style={{ width: 16, height: 16 }} />
              <label htmlFor="pub" style={{ fontSize: '14px', color: '#ccc' }}>Publish immediately</label>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '12px 28px' }}>{saving ? 'Saving…' : editId ? 'Update Event' : 'Create Event'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '12px 20px', background: 'none', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#888', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#555' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
          <p>No events yet. Schedule your first live session.</p>
        </div>
      )}

      {[{ label: '📅 Upcoming', items: upcoming }, { label: '📼 Past Sessions', items: past }].map(section => (
        section.items.length > 0 && (
          <div key={section.label} style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>{section.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {section.items.map(ev => {
                const rsvps = ev.rsvp_count?.[0]?.count || 0;
                const d = new Date(ev.starts_at);
                return (
                  <div key={ev.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 12px', textAlign: 'center', flexShrink: 0, minWidth: '56px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#c9a84c' }}>{d.getDate()}</div>
                      <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{d.toLocaleString('en', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{ev.title}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ev.duration_minutes}min · {ev.tier_required} · {rsvps} RSVPs
                        {ev.is_published ? <span style={{ color: '#22c55e', marginLeft: '8px' }}>● Published</span> : <span style={{ color: '#f59e0b', marginLeft: '8px' }}>● Draft</span>}
                      </div>
                      {ev.zoom_link && <div style={{ fontSize: '11px', color: '#c9a84c', marginTop: '4px' }}>🔗 Zoom link set</div>}
                      {ev.recording_url && <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>📹 Recording available</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => openEdit(ev)} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: 'none', border: '1px solid #2a2a2a', color: '#888' }}>Edit</button>
                      <button onClick={() => togglePublish(ev)} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: 'none', background: ev.is_published ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: ev.is_published ? '#ef4444' : '#22c55e' }}>
                        {ev.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deleteEvent(ev.id)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', background: 'none', color: '#ef4444' }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ))}
    </div>
  );
}
