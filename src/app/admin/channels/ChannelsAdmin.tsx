'use client';
import { useState } from 'react';
import { Channel, MemberTier, AccessGroup, ACCESS_GROUP_LABELS } from '@/types';
import { createClient } from '@/lib/supabase/client';
import AccessGroupSelect from '@/components/admin/AccessGroupSelect';

type ChannelWithAccess = Channel & { access_group?: AccessGroup };

const ICONS = { hash: '#', trophy: '🏆', target: '🎯', 'book-open': '📖', flame: '🔥', crown: '👑' } as Record<string, string>;
const inputStyle = { width: '100%', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' };
const labelStyle = { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' as const };

type ChannelForm = {
  name: string;
  description: string;
  icon: string;
  tier_required: MemberTier;
  access_group: AccessGroup;
  sort_order: number;
};

function emptyForm(): ChannelForm {
  return { name: '', description: '', icon: 'hash', tier_required: 'free', access_group: 'all', sort_order: 10 };
}

export default function ChannelsAdmin({ channels: initial, adminId }: { channels: ChannelWithAccess[]; adminId: string }) {
  const [channels, setChannels] = useState<ChannelWithAccess[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [createForm, setCreateForm] = useState<ChannelForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ChannelForm>(emptyForm());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const supabase = createClient();

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const slug = createForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data, error } = await supabase
      .from('channels')
      .insert({ ...createForm, slug, created_by: adminId })
      .select('*')
      .single();
    setSaving(false);
    if (error) { alert('Create failed: ' + error.message); return; }
    if (data) setChannels(prev => [...prev, data as ChannelWithAccess]);
    setShowForm(false);
    setCreateForm(emptyForm());
  }

  function startEdit(channel: ChannelWithAccess) {
    setEditingId(channel.id);
    setEditForm({
      name: channel.name,
      description: channel.description || '',
      icon: channel.icon || 'hash',
      tier_required: channel.tier_required,
      access_group: (channel.access_group || 'all'),
      sort_order: channel.sort_order,
    });
  }

  async function saveEdit(channelId: string) {
    setSaving(true);
    const updates = { ...editForm };
    const { error } = await supabase.from('channels').update(updates).eq('id', channelId);
    setSaving(false);
    if (error) { alert('Save failed: ' + error.message); return; }
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, ...updates } : c));
    setEditingId(null);
  }

  async function archiveChannel(channelId: string, archived: boolean) {
    await supabase.from('channels').update({ is_archived: archived }).eq('id', channelId);
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, is_archived: archived } : c));
  }

  async function deleteChannel(channelId: string) {
    // Hard delete — cascades to posts via FK on delete cascade.
    const { error } = await supabase.from('channels').delete().eq('id', channelId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    setChannels(prev => prev.filter(c => c.id !== channelId));
    setConfirmDeleteId(null);
  }

  function renderEditForm(channel: ChannelWithAccess) {
    return (
      <div style={{ background: 'var(--black-card)', border: '1px solid var(--gold)', borderRadius: '12px', padding: '20px', marginTop: 8 }}>
        <form onSubmit={e => { e.preventDefault(); saveEdit(channel.id); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Channel Name *</label>
            <input style={inputStyle} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div>
            <AccessGroupSelect
              value={editForm.access_group}
              onChange={v => setEditForm({ ...editForm, access_group: v })}
              label="Who can access this channel?"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Icon</label>
            <select style={inputStyle} value={editForm.icon} onChange={e => setEditForm({ ...editForm, icon: e.target.value })}>
              {Object.entries(ICONS).map(([key, icon]) => <option key={key} value={key}>{icon} {key}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Sort Order</label>
            <input type="number" style={inputStyle} value={editForm.sort_order} onChange={e => setEditForm({ ...editForm, sort_order: Number(e.target.value) })} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '10px 22px' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditingId(null)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 18px', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

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
              <input style={inputStyle} value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} required placeholder="wins" />
            </div>
            <div>
              <AccessGroupSelect
                value={createForm.access_group}
                onChange={v => setCreateForm({ ...createForm, access_group: v })}
                label="Who can access this channel?"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="What this channel is for…" />
            </div>
            <div>
              <label style={labelStyle}>Icon</label>
              <select style={inputStyle} value={createForm.icon} onChange={e => setCreateForm({ ...createForm, icon: e.target.value })}>
                {Object.entries(ICONS).map(([key, icon]) => <option key={key} value={key}>{icon} {key}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input type="number" style={inputStyle} value={createForm.sort_order} onChange={e => setCreateForm({ ...createForm, sort_order: Number(e.target.value) })} />
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
          const icon = ICONS[channel.icon] || '#';
          const isEditing = editingId === channel.id;
          const isConfirmingDelete = confirmDeleteId === channel.id;
          return (
            <div key={channel.id} style={{ opacity: channel.is_archived && !isEditing ? 0.5 : 1 }}>
              <div style={{
                background: 'var(--black-card)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '14px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{icon} {channel.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    #{channel.slug} · {ACCESS_GROUP_LABELS[(channel.access_group || 'all') as AccessGroup]} · Sort: {channel.sort_order}
                    {channel.is_archived && <span style={{ color: '#ef4444', marginLeft: 8 }}>· Archived</span>}
                  </div>
                  {channel.description && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{channel.description}</div>}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!isEditing && !isConfirmingDelete && (
                    <>
                      <button onClick={() => startEdit(channel)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text)' }}>
                        Edit
                      </button>
                      {channel.is_archived ? (
                        <button onClick={() => archiveChannel(channel.id, false)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#22c55e' }}>
                          Restore
                        </button>
                      ) : (
                        <button onClick={() => archiveChannel(channel.id, true)}
                          style={{ background: 'none', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#f59e0b' }}>
                          Archive
                        </button>
                      )}
                      <button onClick={() => setConfirmDeleteId(channel.id)}
                        style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#ef4444' }}>
                        Delete
                      </button>
                    </>
                  )}
                  {isConfirmingDelete && (
                    <>
                      <span style={{ fontSize: 11, color: '#ef4444', whiteSpace: 'nowrap', alignSelf: 'center' }}>Delete forever?</span>
                      <button onClick={() => deleteChannel(channel.id)}
                        style={{ background: '#ef4444', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 700 }}>
                        Yes
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}>
                        No
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing && renderEditForm(channel)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
