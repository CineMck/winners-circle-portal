'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Category { id: string; name: string; sort_order: number; }
interface Resource { id: string; title: string; description?: string; file_url?: string; file_type?: string; file_size_bytes?: number; category_id?: string; tier_required: string; is_published: boolean; download_count: number; created_at: string; category?: { name: string }; }

const inputStyle: React.CSSProperties = { width: '100%', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' };

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type?: string) {
  if (!type) return '📄';
  if (type.includes('pdf')) return '📕';
  if (type.includes('word') || type.includes('doc')) return '📘';
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return '📗';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📙';
  if (type.includes('image')) return '🖼️';
  if (type.includes('video')) return '🎬';
  return '📄';
}

export default function ResourcesAdmin({ categories, resources: initial, adminId }: { categories: Category[]; resources: Resource[]; adminId: string }) {
  const [resources, setResources] = useState<Resource[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category_id: '', tier_required: 'free', is_published: true });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function createResource(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) { alert('Please select a file to upload.'); return; }
    setSaving(true); setUploading(true);

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('folder', 'resources');
    fd.append('userId', adminId);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    setUploading(false);

    if (json.error) { alert('Upload failed: ' + json.error); setSaving(false); return; }

    const { data } = await supabase.from('resources').insert({
      ...form,
      category_id: form.category_id || null,
      file_url: json.url,
      file_type: selectedFile.type,
      file_size_bytes: selectedFile.size,
    }).select('*, category:resource_categories(name)').single();

    if (data) setResources(prev => [data as Resource, ...prev]);
    setForm({ title: '', description: '', category_id: '', tier_required: 'free', is_published: true });
    setSelectedFile(null);
    setShowForm(false);
    setSaving(false);
  }

  async function deleteResource(id: string) {
    if (!confirm('Delete this resource?')) return;
    await supabase.from('resources').delete().eq('id', id);
    setResources(prev => prev.filter(r => r.id !== id));
  }

  async function togglePublish(r: Resource) {
    await supabase.from('resources').update({ is_published: !r.is_published }).eq('id', r.id);
    setResources(prev => prev.map(res => res.id === r.id ? { ...res, is_published: !r.is_published } : res));
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>📚 Resource Library</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>{resources.length} resource{resources.length !== 1 ? 's' : ''} · {resources.filter(r => r.is_published).length} published</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>
          {showForm ? '× Cancel' : '+ Upload Resource'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#111', border: '1px solid #c9a84c', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ margin: '0 0 20px', color: '#c9a84c', fontSize: '15px', fontWeight: 700 }}>Upload Resource</h3>
          <form onSubmit={createResource} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>File *</label>
              <div style={{ background: '#161616', border: `2px dashed ${selectedFile ? '#22c55e' : '#2a2a2a'}`, borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.mp4,.mov" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); if (!form.title) setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') })); } }} />
                {selectedFile
                  ? <div><span style={{ fontSize: '24px' }}>{fileIcon(selectedFile.type)}</span><br /><span style={{ fontSize: '13px', color: '#22c55e' }}>{selectedFile.name} ({formatBytes(selectedFile.size)})</span></div>
                  : <div><span style={{ fontSize: '32px' }}>📂</span><br /><span style={{ fontSize: '13px', color: '#888' }}>Click to select file (PDF, Word, Excel, PPT, video…)</span></div>}
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Real Estate Deal Analyzer Template" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What's this resource for…" />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tier Required</label>
              <select style={inputStyle} value={form.tier_required} onChange={e => setForm({ ...form, tier_required: e.target.value })}>
                <option value="free">Free (all members)</option>
                <option value="core">Core+</option>
                <option value="elite">Elevate+</option>
                <option value="founding">1-1 Elite Only</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" disabled={saving || !selectedFile} className="btn-gold" style={{ padding: '12px 28px' }}>
                {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Upload & Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {resources.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#555' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
          <p>No resources yet. Upload your first file above.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {resources.map(r => (
          <div key={r.id} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '28px', flexShrink: 0 }}>{fileIcon(r.file_type)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{r.title}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                {r.category?.name && <span>{r.category.name} · </span>}
                {r.tier_required} · {formatBytes(r.file_size_bytes)} · {r.download_count} downloads
                {r.is_published ? <span style={{ color: '#22c55e', marginLeft: '8px' }}>● Published</span> : <span style={{ color: '#f59e0b', marginLeft: '8px' }}>● Draft</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => togglePublish(r)} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: 'none', background: r.is_published ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: r.is_published ? '#ef4444' : '#22c55e' }}>
                {r.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button onClick={() => deleteResource(r.id)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', background: 'none', color: '#ef4444' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
