'use client';
import { useState } from 'react';
import { type EmailTemplate } from './EmailMarketingShell';
import { BLOCK_COLORS, BLOCK_ICONS } from '@/lib/email/blocks';

interface Props {
  templates: EmailTemplate[];
  onRefresh: () => void;
  onUse: (template: EmailTemplate) => void;
  onNewCompose: () => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function TemplateLibrary({ templates, onRefresh, onUse, onNewCompose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleDelete(t: EmailTemplate) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    setLoading(t.id + '_del');
    try {
      await fetch(`/api/admin/templates/${t.id}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { alert(String(e)); }
    setLoading(null);
  }

  function startEdit(t: EmailTemplate) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditDesc(t.description || '');
  }

  async function saveEdit(t: EmailTemplate) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/templates/${t.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditingId(null);
      onRefresh();
    } catch (e) { alert(String(e)); }
    setSaving(false);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>📄 Email Templates</h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>Save your best layouts to reuse in future campaigns.</p>
        </div>
        <button onClick={onNewCompose} style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #333', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
          + New Campaign
        </button>
      </div>

      {/* Empty state */}
      {templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#666' }}>No templates yet</div>
          <div style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>
            Build an email, then use &ldquo;Save as Template&rdquo; to save it for reuse.
          </div>
          <button onClick={onNewCompose} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '10px 22px', cursor: 'pointer', fontSize: '13px', fontWeight: 800 }}>
            Create a Campaign
          </button>
        </div>
      )}

      {/* Template grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
        {templates.map(t => {
          const isEditingThis = editingId === t.id;
          const isDeleting = loading === t.id + '_del';
          // Build a small block summary
          const blockSummary = (t.blocks || []).slice(0, 5);

          return (
            <div key={t.id} style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Mini preview */}
              <div style={{ background: '#0d0d0d', borderBottom: '1px solid var(--border)', padding: '12px 16px', minHeight: '80px' }}>
                {blockSummary.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {blockSummary.map((block, i) => {
                      const tc = BLOCK_COLORS[block.type] || '#555';
                      return (
                        <span key={i} style={{ fontSize: '10px', fontWeight: 700, color: tc, background: `${tc}18`, padding: '2px 7px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '9px' }}>{BLOCK_ICONS[block.type]}</span>
                          {block.type}
                        </span>
                      );
                    })}
                    {(t.blocks || []).length > 5 && (
                      <span style={{ fontSize: '10px', color: '#555', padding: '2px 6px' }}>+{(t.blocks || []).length - 5} more</span>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#333', fontSize: '12px', fontStyle: 'italic' }}>Empty template</div>
                )}
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#444' }}>
                  {(t.blocks || []).length} block{(t.blocks || []).length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: '14px 16px', flex: 1 }}>
                {isEditingThis ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Template name"
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '7px', padding: '7px 10px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                      placeholder="Description (optional)"
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '7px', padding: '7px 10px', color: '#888', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => saveEdit(t)} disabled={saving || !editName.trim()}
                        style={{ flex: 1, background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: '7px', padding: '7px', cursor: 'pointer', color: '#22c55e', fontSize: '12px', fontWeight: 700 }}>
                        {saving ? '…' : '✓ Save'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '7px', padding: '7px', cursor: 'pointer', color: '#666', fontSize: '12px', fontWeight: 600 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{t.name}</div>
                    {t.description && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{t.description}</div>}
                    <div style={{ fontSize: '11px', color: '#444', marginBottom: '12px' }}>Created {timeAgo(t.created_at)}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => onUse(t)}
                        style={{ flex: 1, background: '#c9a84c', border: 'none', borderRadius: '7px', padding: '8px', cursor: 'pointer', color: '#0a0a0a', fontSize: '12px', fontWeight: 800 }}>
                        Use Template
                      </button>
                      <button onClick={() => startEdit(t)}
                        style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '7px', padding: '8px 10px', cursor: 'pointer', color: '#888', fontSize: '12px' }}>
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(t)} disabled={isDeleting}
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '8px 10px', cursor: 'pointer', color: '#ef4444', fontSize: '12px' }}>
                        {isDeleting ? '…' : '🗑'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
