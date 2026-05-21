'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  type Block, type HeadingBlock, type TextBlock, type ImageBlock,
  type VideoBlock, type ButtonBlock, type SpacerBlock,
  BLOCK_TYPES, BLOCK_COLORS, BLOCK_ICONS, makeBlock, blocksToHtml,
} from '@/lib/email/blocks';

interface TierCounts { all: number; paid: number; core: number; elite: number; founding: number }

const TIER_OPTIONS = [
  { value: 'all',      label: 'All Members',     color: '#888' },
  { value: 'paid',     label: 'All Paid',         color: '#c9a84c' },
  { value: 'core',     label: 'Core',             color: '#c9a84c' },
  { value: 'elite',    label: 'Elite',            color: '#e0c068' },
  { value: 'founding', label: 'Founding',         color: '#ffd700' },
];

interface Props {
  tierCounts: TierCounts;
  initialBlocks?: Block[];
  initialSubject?: string;
  initialName?: string;
  initialTier?: string;
  campaignId?: string;
  onSaved?: () => void;
  onTemplateSaved?: () => void;
}

// ─── Right panel: block property editors ──────────────────────────────────────
function BlockProperties({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoInput, setVideoInput] = useState(block.type === 'video' ? block.videoUrl : '');

  const inp: React.CSSProperties = {
    width: '100%', background: '#1a1a1a', border: '1px solid #333',
    borderRadius: '8px', padding: '9px 12px', color: '#fff',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || block.type !== 'image') return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `email-images/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      onChange({ ...block, url: publicUrl } as ImageBlock);
    } catch (err) { alert('Upload failed: ' + String(err)); }
    setUploading(false);
  }

  async function fetchVideoThumbnail(url: string) {
    if (!url.trim() || block.type !== 'video') return;
    setVideoLoading(true);
    setVideoError('');
    try {
      const res = await fetch(`/api/admin/video-thumbnail?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) setVideoError(data.error || 'Could not fetch thumbnail');
      else onChange({ ...block, videoUrl: url, thumbnailUrl: data.thumbnailUrl, platform: data.platform } as VideoBlock);
    } catch (e) { setVideoError(String(e)); }
    setVideoLoading(false);
  }

  const tc = BLOCK_COLORS[block.type] || '#888';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Block type badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid #222' }}>
        <div style={{ width: 28, height: 28, borderRadius: '6px', background: `${tc}22`, color: tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>
          {BLOCK_ICONS[block.type]}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: tc, textTransform: 'capitalize' }}>{block.type} Block</span>
      </div>

      {/* HEADING */}
      {block.type === 'heading' && (
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Heading Text</label>
          <input value={block.text} onChange={e => onChange({ ...block, text: e.target.value } as HeadingBlock)}
            placeholder="Section heading…" style={{ ...inp, fontSize: '15px', fontWeight: 700 }} />
        </div>
      )}

      {/* TEXT */}
      {block.type === 'text' && (
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paragraph Text</label>
          <textarea value={block.text} onChange={e => onChange({ ...block, text: e.target.value } as TextBlock)}
            placeholder="Write your paragraph here…" rows={6}
            style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }} />
        </div>
      )}

      {/* IMAGE */}
      {block.type === 'image' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Image</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={block.url} onChange={e => onChange({ ...block, url: e.target.value } as ImageBlock)}
                placeholder="Image URL (https://…)" style={{ ...inp, flex: 1 }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', color: '#ccc', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {uploading ? '…' : '⬆ Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </div>
          </div>
          {block.url && (
            <img src={block.url} alt="preview" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '6px' }} onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alt Text</label>
            <input value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value } as ImageBlock)}
              placeholder="Describe the image…" style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Link URL (optional)</label>
            <input value={block.linkUrl} onChange={e => onChange({ ...block, linkUrl: e.target.value } as ImageBlock)}
              placeholder="https://…" style={inp} />
          </div>
        </div>
      )}

      {/* VIDEO */}
      {block.type === 'video' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>YouTube or Vimeo URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={videoInput} onChange={e => setVideoInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchVideoThumbnail(videoInput); }}
                placeholder="https://youtube.com/watch?v=…" style={{ ...inp, flex: 1 }} />
              <button onClick={() => fetchVideoThumbnail(videoInput)} disabled={videoLoading}
                style={{ background: '#a78bfa22', border: '1px solid #a78bfa55', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', color: '#a78bfa', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {videoLoading ? '…' : '▶ Load'}
              </button>
            </div>
          </div>
          {videoError && <div style={{ fontSize: '12px', color: '#ef4444', padding: '6px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>⚠️ {videoError}</div>}
          {block.thumbnailUrl && (
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
              <img src={block.thumbnailUrl} alt="thumbnail" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px', paddingLeft: '3px' }}>▶</div>
              </div>
              {block.platform && <div style={{ position: 'absolute', top: 6, right: 6, background: '#a78bfa', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', textTransform: 'uppercase' }}>{block.platform}</div>}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Caption (optional)</label>
            <input value={block.caption} onChange={e => onChange({ ...block, caption: e.target.value } as VideoBlock)}
              placeholder="Caption below video…" style={inp} />
          </div>
        </div>
      )}

      {/* BUTTON */}
      {block.type === 'button' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Button Label</label>
            <input value={block.label} onChange={e => onChange({ ...block, label: e.target.value } as ButtonBlock)}
              placeholder="e.g. Watch Now →" style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Link URL</label>
            <input value={block.href} onChange={e => onChange({ ...block, href: e.target.value } as ButtonBlock)}
              placeholder="https://…" style={inp} />
          </div>
          <div style={{ textAlign: 'center', paddingTop: '4px' }}>
            <span style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontWeight: 800, fontSize: '13px', padding: '8px 22px', borderRadius: '8px' }}>
              {block.label || 'Button Label'}
            </span>
          </div>
        </div>
      )}

      {/* SPACER */}
      {block.type === 'spacer' && (
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Spacer Size</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['sm', 'md', 'lg'] as const).map(size => (
              <button key={size} onClick={() => onChange({ ...block, size } as SpacerBlock)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', border: `1px solid ${block.size === size ? '#c9a84c' : '#333'}`, background: block.size === size ? 'rgba(201,168,76,0.15)' : '#1a1a1a', color: block.size === size ? '#c9a84c' : '#666' }}>
                {size.toUpperCase()}
                <div style={{ fontSize: '10px', fontWeight: 400, color: '#555', marginTop: '2px' }}>
                  {size === 'sm' ? '16px' : size === 'md' ? '32px' : '48px'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DIVIDER */}
      {block.type === 'divider' && (
        <div style={{ padding: '8px 0', textAlign: 'center', color: '#555', fontSize: '12px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '0 0 8px' }} />
          Horizontal rule — no settings needed.
        </div>
      )}
    </div>
  );
}

// ─── Canvas block preview row ──────────────────────────────────────────────────
function CanvasBlock({
  block, isSelected, isDragOver,
  onClick, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  block: Block;
  isSelected: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const tc = BLOCK_COLORS[block.type] || '#888';

  function renderPreview() {
    switch (block.type) {
      case 'heading':
        return <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{block.text || <span style={{ color: '#444', fontStyle: 'italic' }}>Heading text…</span>}</div>;

      case 'text':
        return <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{block.text || <span style={{ color: '#444', fontStyle: 'italic' }}>Paragraph text…</span>}</div>;

      case 'image':
        return block.url
          ? <img src={block.url} alt={block.alt} style={{ width: '100%', borderRadius: '6px', display: 'block', maxHeight: '160px', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
          : <div style={{ background: '#1a1a1a', border: '1px dashed #333', borderRadius: '6px', padding: '24px', textAlign: 'center', color: '#444', fontSize: '12px' }}>🖼 Image — click to add URL or upload</div>;

      case 'video':
        return (
          <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden' }}>
            {block.thumbnailUrl
              ? <>
                  <img src={block.thumbnailUrl} alt="video" style={{ width: '100%', display: 'block', maxHeight: '140px', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.75)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', paddingLeft: '3px' }}>▶</div>
                  </div>
                  {block.caption && <div style={{ background: '#111', fontSize: '11px', color: '#888', textAlign: 'center', padding: '6px' }}>{block.caption}</div>}
                </>
              : <div style={{ background: '#1a1a1a', border: '1px dashed #a78bfa44', borderRadius: '6px', padding: '24px', textAlign: 'center', color: '#666', fontSize: '12px' }}>▶ Paste a YouTube or Vimeo URL to load thumbnail</div>
            }
          </div>
        );

      case 'button':
        return (
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontWeight: 800, fontSize: '13px', padding: '10px 24px', borderRadius: '8px' }}>
              {block.label || 'Button Label'}
            </span>
          </div>
        );

      case 'divider':
        return <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '4px 0' }} />;

      case 'spacer': {
        const h = block.size === 'sm' ? 16 : block.size === 'lg' ? 48 : 32;
        return (
          <div style={{ height: `${h}px`, background: '#1a1a1a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '10px', color: '#444', fontWeight: 600 }}>SPACER ({block.size?.toUpperCase()})</span>
          </div>
        );
      }

      default: return null;
    }
  }

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        position: 'relative',
        marginBottom: '4px',
        borderRadius: '10px',
        border: isSelected ? `2px solid #c9a84c` : isDragOver ? `2px dashed #c9a84c88` : '2px solid transparent',
        cursor: 'pointer',
        transition: 'border-color 0.12s',
        background: isDragOver ? 'rgba(201,168,76,0.05)' : 'transparent',
      }}
    >
      {/* Drag handle + type chip */}
      <div style={{
        position: 'absolute', top: '6px', left: '6px', zIndex: 2,
        display: 'flex', alignItems: 'center', gap: '4px',
        opacity: isSelected ? 1 : 0.4,
        transition: 'opacity 0.15s',
        pointerEvents: 'none',
      }}>
        <span style={{ color: '#666', fontSize: '14px', cursor: 'grab', userSelect: 'none' }}>⠿</span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: tc, background: `${tc}22`, padding: '1px 6px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          {block.type}
        </span>
      </div>

      {/* Delete button */}
      {isSelected && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 2, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '5px', padding: '2px 7px', cursor: 'pointer', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
          ✕
        </button>
      )}

      {/* Content preview */}
      <div style={{ padding: '24px 14px 10px', borderLeft: `3px solid ${tc}`, borderRadius: '8px' }}>
        {renderPreview()}
      </div>
    </div>
  );
}

// ─── Main EmailComposer ────────────────────────────────────────────────────────
export default function EmailComposer({
  tierCounts, initialBlocks, initialSubject, initialName,
  initialTier, campaignId, onSaved, onTemplateSaved,
}: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks || []);
  const [subject, setSubject] = useState(initialSubject || '');
  const [campaignName, setCampaignName] = useState(initialName || '');
  const [tier, setTier] = useState(initialTier || 'paid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Action states
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  const selectedBlock = blocks.find(b => b.id === selectedId) || null;
  const selectedCount = tierCounts[tier as keyof TierCounts] ?? 0;

  // Auto-clear result after 5s
  useEffect(() => {
    if (result) { const t = setTimeout(() => setResult(null), 5000); return () => clearTimeout(t); }
  }, [result]);

  // ── Block operations ────────────────────────────────────────────────────────
  const updateBlock = useCallback((id: string, updated: Block) => {
    setBlocks(prev => prev.map(b => b.id === id ? updated : b));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  function addBlock(type: Block['type']) {
    const nb = makeBlock(type);
    setBlocks(prev => [...prev, nb]);
    setSelectedId(nb.id);
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setBlocks(prev => {
      const from = prev.findIndex(b => b.id === dragId);
      const to   = prev.findIndex(b => b.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
    setDragId(null);
    setDropTargetId(null);
  }

  // ── Save draft ──────────────────────────────────────────────────────────────
  async function handleSaveDraft() {
    if (!subject.trim()) { setResult({ type: 'error', message: 'Subject line is required.' }); return; }
    setSaving(true);
    try {
      const body = { name: campaignName || subject, subject, blocks, tier, html_body: '', status: 'draft' };
      let res: Response;
      if (campaignId) {
        res = await fetch(`/api/admin/campaigns/${campaignId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        res = await fetch('/api/admin/campaigns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setResult({ type: 'success', message: '✅ Draft saved!' });
      onSaved?.();
    } catch (e) { setResult({ type: 'error', message: String(e) }); }
    setSaving(false);
  }

  // ── Save as template ────────────────────────────────────────────────────────
  async function handleSaveTemplate() {
    if (!templateNameInput.trim()) return;
    if (blocks.length === 0) { setResult({ type: 'error', message: 'Add blocks before saving as template.' }); return; }
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: templateNameInput, description: subject || '', blocks }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Save failed'); }
      setResult({ type: 'success', message: '✅ Template saved!' });
      setShowTemplateModal(false);
      setTemplateNameInput('');
      onTemplateSaved?.();
    } catch (e) { setResult({ type: 'error', message: String(e) }); }
    setSavingTemplate(false);
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!subject.trim()) { setResult({ type: 'error', message: 'Subject line is required.' }); return; }
    if (blocks.length === 0) { setResult({ type: 'error', message: 'Add at least one content block.' }); return; }
    setSending(true);
    setConfirmSend(false);
    try {
      const htmlBody = blocksToHtml(blocks);
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subject, htmlBody, tier, blocks, campaignName: campaignName || subject, campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setResult({ type: 'success', message: `✅ Sent to ${data.sent} member${data.sent !== 1 ? 's' : ''}!` });
      onSaved?.();
    } catch (e) { setResult({ type: 'error', message: String(e) }); }
    setSending(false);
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const panelCard: React.CSSProperties = {
    background: 'var(--black-card)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '16px',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: '#666',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#161616', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '9px 12px', color: '#fff',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: '16px', alignItems: 'start' }}>

      {/* ── LEFT PANEL ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '80px' }}>

        {/* Campaign name */}
        <div style={panelCard}>
          <label style={labelStyle}>Campaign Name</label>
          <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
            placeholder="e.g. May Newsletter"
            style={inputStyle} />
        </div>

        {/* Recipients */}
        <div style={panelCard}>
          <label style={labelStyle}>Recipients</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TIER_OPTIONS.map(opt => (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', borderRadius: '7px', cursor: 'pointer',
                background: tier === opt.value ? 'rgba(201,168,76,0.08)' : 'transparent',
                border: `1px solid ${tier === opt.value ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
              }}>
                <input type="radio" name="tier" value={opt.value} checked={tier === opt.value} onChange={() => setTier(opt.value)} style={{ accentColor: '#c9a84c' }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: tier === opt.value ? opt.color : 'var(--text)' }}>{opt.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: tier === opt.value ? opt.color : '#555', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: '10px' }}>
                  {tierCounts[opt.value as keyof TierCounts]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div style={panelCard}>
          <label style={labelStyle}>Subject Line</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="🏆 This Week in The Winner's Circle"
            style={inputStyle} />
        </div>

        {/* Add blocks */}
        <div style={panelCard}>
          <label style={labelStyle}>Add Block</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} onClick={() => addBlock(bt.type)} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: `${bt.color}15`, border: `1px solid ${bt.color}40`,
                borderRadius: '16px', padding: '4px 10px', cursor: 'pointer',
                color: bt.color, fontSize: '11px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '10px' }}>{bt.icon}</span> {bt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleSaveDraft} disabled={saving}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#ccc', fontSize: '13px', fontWeight: 700 }}>
            {saving ? 'Saving…' : '💾 Save Draft'}
          </button>
          <button onClick={() => setShowTemplateModal(true)}
            style={{ background: '#1a1a1a', border: '1px solid #60a5fa44', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: '#60a5fa', fontSize: '13px', fontWeight: 700 }}>
            📄 Save as Template
          </button>
          <button onClick={() => setConfirmSend(true)} disabled={sending || !subject.trim() || blocks.length === 0}
            style={{
              background: sending || !subject.trim() || blocks.length === 0 ? '#5a4a20' : '#c9a84c',
              color: '#0a0a0a', border: 'none', borderRadius: '8px',
              padding: '12px', cursor: sending || !subject.trim() || blocks.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 800,
            }}>
            {sending ? `Sending…` : `✉️ Send to ${selectedCount}`}
          </button>
        </div>

        {/* Result message */}
        {result && (
          <div style={{
            padding: '10px 14px', borderRadius: '8px',
            background: result.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${result.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontSize: '13px', color: result.type === 'success' ? '#22c55e' : '#ef4444',
          }}>
            {result.message}
          </div>
        )}
      </div>

      {/* ── CENTER CANVAS ─────────────────────────────────────────── */}
      <div>
        {/* Email wrapper */}
        <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          {/* Email header */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderTop: '4px solid #c9a84c', borderRadius: '12px 12px 0 0', padding: '20px 24px', textAlign: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: '26px', marginBottom: '4px' }}>🏆</div>
            <div style={{ fontWeight: 800, color: '#c9a84c', fontSize: '15px' }}>The Winner&apos;s Circle</div>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Private Mastermind Community</div>
          </div>

          {/* Subject preview */}
          {subject && (
            <div style={{ background: '#111', borderLeft: '1px solid #1e1e1e', borderRight: '1px solid #1e1e1e', padding: '16px 24px 4px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{subject}</h2>
            </div>
          )}

          {/* Blocks canvas */}
          <div
            style={{ background: '#111', borderLeft: '1px solid #1e1e1e', borderRight: '1px solid #1e1e1e', padding: '12px 24px', minHeight: '200px' }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedId(null); }}
          >
            {blocks.length === 0 && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#333', fontSize: '14px', border: '1px dashed #222', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✉️</div>
                Add blocks from the left panel to start building your email
              </div>
            )}

            {blocks.map(block => (
              <CanvasBlock
                key={block.id}
                block={block}
                isSelected={selectedId === block.id}
                isDragOver={dropTargetId === block.id}
                onClick={() => setSelectedId(block.id)}
                onDelete={() => deleteBlock(block.id)}
                onDragStart={() => setDragId(block.id)}
                onDragOver={e => { e.preventDefault(); setDropTargetId(block.id); }}
                onDrop={e => { e.preventDefault(); handleDrop(block.id); }}
                onDragEnd={() => { setDragId(null); setDropTargetId(null); }}
              />
            ))}
          </div>

          {/* Footer CTA preview */}
          {blocks.length > 0 && (
            <div style={{ background: '#111', borderLeft: '1px solid #1e1e1e', borderRight: '1px solid #1e1e1e', padding: '0 24px 20px', textAlign: 'center' }}>
              <span style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontWeight: 800, fontSize: '12px', padding: '8px 20px', borderRadius: '8px' }}>
                Open The Winner&apos;s Circle →
              </span>
            </div>
          )}

          {/* Email footer */}
          <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderTop: '1px solid #1a1a1a', borderRadius: '0 0 12px 12px', padding: '14px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#444' }}>You&apos;re receiving this as a member of The Winner&apos;s Circle.</div>
          </div>
        </div>

        {/* Canvas hint */}
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#444' }}>
          Click a block to edit it · Drag to reorder
        </div>
      </div>

      {/* ── RIGHT PROPERTIES PANEL ────────────────────────────────── */}
      <div style={{ position: 'sticky', top: '80px' }}>
        <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', minHeight: '200px' }}>
          {selectedBlock ? (
            <>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                Block Properties
              </div>
              <BlockProperties
                block={selectedBlock}
                onChange={updated => updateBlock(selectedBlock.id, updated)}
              />
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '10px', color: '#444', textAlign: 'center' }}>
              <div style={{ fontSize: '28px' }}>👆</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Click a block to edit</div>
              <div style={{ fontSize: '11px', color: '#333' }}>Properties will appear here</div>
            </div>
          )}
        </div>
      </div>

      {/* ── TEMPLATE SAVE MODAL ──────────────────────────────────────── */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowTemplateModal(false)}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', width: '380px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>💾 Save Template</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#888' }}>Save your current blocks as a reusable template.</p>
            <input
              autoFocus
              value={templateNameInput}
              onChange={e => setTemplateNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); }}
              placeholder="Template name (e.g. Monthly Newsletter)"
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTemplateModal(false)}
                style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', color: '#888', fontSize: '13px', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleSaveTemplate} disabled={!templateNameInput.trim() || savingTemplate}
                style={{ background: '#60a5fa', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', color: '#0a0a0a', fontSize: '13px', fontWeight: 800 }}>
                {savingTemplate ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEND CONFIRM MODAL ──────────────────────────────────────── */}
      {confirmSend && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setConfirmSend(false)}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', width: '380px', maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>✉️ Send Campaign?</h3>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#888' }}>
              You&apos;re about to send <strong style={{ color: '#fff' }}>&quot;{subject}&quot;</strong> to:
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 800, color: '#c9a84c' }}>
              {selectedCount} member{selectedCount !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmSend(false)}
                style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', color: '#888', fontSize: '13px', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleSend}
                style={{ background: '#c9a84c', border: 'none', borderRadius: '8px', padding: '9px 22px', cursor: 'pointer', color: '#0a0a0a', fontSize: '13px', fontWeight: 800 }}>
                Send Now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
