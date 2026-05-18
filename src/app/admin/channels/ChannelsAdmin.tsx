'use client';
import { useState } from 'react';
import { Channel, MemberTier } from '@/types';
import { createClient } from '@/lib/supabase/client';

export default function ChannelsAdmin({ channels: initial, adminId }: { channels: Channel[]; adminId: string }) {
  const [channels, setChannels] = useState<Channel[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: 'hash', tier_required: 'free' as MemberTier, sort_order: 10 });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data } = await supabase.from('channels').insert({ ...form, slug, created_by: adminId }).select('*').single();
    if (data) setChannels(prev => [...prev, data as Channel]);
    setSaving(false);
    setShowForm(false);
    setForm({ name: '', description: '', icon: 'hash', tier_required: 'free', sort_order: 10 });
  }

  async function archiveChannel(channelId: string) {
    if (!confirm('Archive this channel? Members will no longer see it.')) return;
    await supabase.from('channels').update({ is_archived: true }).eq('id', channelId);
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, is_archived: true } : c));
  }

  const inputStyle = { width: '100%', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' };
  const labelStyle = { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' as const };
  const tierIcons = { hash: '#', trophy: '🏆', target: '🎯', 'book-open': '📖', flame: '🔥', crown: '👑' } as Record<string, string>;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>💬 Channels ({channels.filter(c => !c.is_archived).length})</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>
          {showForm ? '× Cancel' : '+ New Channel'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--black-card)', border: '1px solid var(--gold)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <form onSubmit={createChannel} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Channel Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="wins" />
            </div>
            <div>
              <label style={labelStyle}>Tier Required</label>
              <select style={inputStyle} value={form.tier_required} onChange={e => setForm({...form, tier_required: e.target.value as MemberTier})}>
                <option value="free">Free</option>
                <option value="core">Core+</option>
                <option value="elite">Elite+</option>
                <option value="founding">Founding Only</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What this channel is for…" />
            </div>
            <div>
              <label style={labelStyle}>Icon</label>
              <select style={inputStyle} value={form.icon} onChange={e => setForm({...form, icon: e.target.value})}>
                {Object.entries(tierIcons).map(([key, icon]) => <option key={key} value={key}>{icon} {key}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input type="number" style={inputStyle} value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '12px 28px' }}>
                {saving ? 'Creating…' : 'Create Channel'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {channels.map(channel => {
          const icon = tierIcons[channel.icon] || '#';
          return (
            <div key={channel.id} style={{
              background: 'var(--black-card)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '14px 20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              opacity: channel.is_archived ? 0.4 : 1,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{icon} {channel.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  #{channel.slug} · {channel.tier_required} · Sort: {channel.sort_order}
                </div>
                {channel.description && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{channel.description}</div>}
              </div>
              {!channel.is_archived && (
                <button onClick={() => archiveChannel(channel.id)}
                  style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', color: '#ef4444' }}>
                  Archive
                </button>
              )}
              {channel.is_archived && <span style={{ fontSize: '12px', color: '#ef4444' }}>Archived</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
