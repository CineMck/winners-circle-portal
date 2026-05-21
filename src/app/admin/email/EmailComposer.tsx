'use client';
import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Block types ─────────────────────────────────────────────────────────────
type HeadingBlock  = { id: string; type: 'heading'; text: string };
type TextBlock     = { id: string; type: 'text'; text: string };
type ImageBlock    = { id: string; type: 'image'; url: string; alt: string; linkUrl: string };
type VideoBlock    = { id: string; type: 'video'; videoUrl: string; thumbnailUrl: string; caption: string; platform: string };
type ButtonBlock   = { id: string; type: 'button'; label: string; href: string };
type DividerBlock  = { id: string; type: 'divider' };
type Block = HeadingBlock | TextBlock | ImageBlock | VideoBlock | ButtonBlock | DividerBlock;

interface TierCounts { all: number; paid: number; core: number; elite: number; founding: number }

const TIER_OPTIONS = [
  { value: 'all',      label: 'All Members',          desc: 'Everyone including free',    color: '#888' },
  { value: 'paid',     label: 'All Paid Members',      desc: 'Core, Elite & Founding',     color: '#c9a84c' },
  { value: 'core',     label: 'Core Members',          desc: 'Core tier only',             color: '#c9a84c' },
  { value: 'elite',    label: 'Elite Members',         desc: 'Elite tier only',            color: '#e0c068' },
  { value: 'founding', label: 'Founding Members',      desc: 'Founding tier only',         color: '#ffd700' },
];

const uid = () => Math.random().toString(36).slice(2, 10);

// ─── HTML generation ─────────────────────────────────────────────────────────
function blocksToHtml(blocks: Block[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading':
        return `<h2 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">${escHtml(b.text)}</h2>`;

      case 'text':
        return `<p style="margin:0 0 16px;font-size:15px;color:#cccccc;line-height:1.7;">${escHtml(b.text).replace(/\n/g, '<br>')}</p>`;

      case 'image': {
        const img = `<img src="${escAttr(b.url)}" alt="${escAttr(b.alt)}" width="100%" style="display:block;width:100%;border-radius:8px;margin-bottom:16px;" />`;
        return b.linkUrl
          ? `<a href="${escAttr(b.linkUrl)}" target="_blank" style="display:block;">${img}</a>`
          : img;
      }

      case 'video': {
        const playBtn = `
          <table width="60" height="60" cellpadding="0" cellspacing="0" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
            <tr><td align="center" valign="middle" style="width:60px;height:60px;background:rgba(0,0,0,0.72);border-radius:50%;">
              <span style="color:#ffffff;font-size:22px;line-height:1;padding-left:4px;">&#9654;</span>
            </td></tr>
          </table>`;
        return `
          <div style="position:relative;margin-bottom:16px;">
            <a href="${escAttr(b.videoUrl)}" target="_blank" style="display:block;position:relative;">
              <img src="${escAttr(b.thumbnailUrl)}" width="100%" alt="${escAttr(b.caption || 'Watch video')}" style="display:block;width:100%;border-radius:8px;" />
              ${playBtn}
            </a>
            ${b.caption ? `<p style="margin:8px 0 0;font-size:13px;color:#888;text-align:center;">${escHtml(b.caption)}</p>` : ''}
          </div>`;
      }

      case 'button':
        return `
          <div style="text-align:center;margin-bottom:20px;">
            <a href="${escAttr(b.href)}" target="_blank"
               style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
              ${escHtml(b.label)}
            </a>
          </div>`;

      case 'divider':
        return `<hr style="border:none;border-top:1px solid #2a2a2a;margin:20px 0;" />`;

      default: return '';
    }
  }).join('\n');
}

function escHtml(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s: string) { return s.replace(/"/g,'&quot;'); }

function wrapInTemplate(subject: string, body: string, appUrl: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#111;border:1px solid #1e1e1e;border-top:4px solid #c9a84c;border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
  <div style="font-size:32px;margin-bottom:8px;">🏆</div>
  <div style="font-size:20px;font-weight:800;color:#c9a84c;">The Winner's Circle</div>
  <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Private Mastermind Community</div>
</td></tr>
<tr><td style="background:#111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;padding:32px 36px;">
${body}
</td></tr>
<tr><td style="background:#111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;padding:0 36px 32px;text-align:center;">
  <a href="${appUrl}/home" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Open The Winner's Circle →</a>
</td></tr>
<tr><td style="background:#0d0d0d;border:1px solid #1e1e1e;border-top:1px solid #1a1a1a;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#555;">You're receiving this as a member of The Winner's Circle.<br/>
  <a href="${appUrl}/profile" style="color:#888;text-decoration:underline;">Manage your account</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ─── Individual block editors ─────────────────────────────────────────────────
function BlockCard({
  block, index, total,
  onChange, onDelete, onMove,
}: {
  block: Block; index: number; total: number;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');

  const inp: React.CSSProperties = {
    width: '100%', background: '#1a1a1a', border: '1px solid #333',
    borderRadius: '8px', padding: '9px 12px', color: '#fff',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };

  const typeColors: Record<string, string> = {
    heading: '#c9a84c', text: '#60a5fa', image: '#22c55e',
    video: '#a78bfa', button: '#f97316', divider: '#888',
  };
  const typeIcons: Record<string, string> = {
    heading: 'H', text: '¶', image: '🖼', video: '▶', button: '⬜', divider: '—',
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
    } catch (err) {
      alert('Upload failed: ' + String(err));
    }
    setUploading(false);
  }

  async function fetchVideoThumbnail(url: string) {
    if (block.type !== 'video') return;
    if (!url.trim()) return;
    setVideoLoading(true);
    setVideoError('');
    try {
      const res = await fetch(`/api/admin/video-thumbnail?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) { setVideoError(data.error || 'Could not fetch thumbnail'); }
      else {
        onChange({ ...block, videoUrl: url, thumbnailUrl: data.thumbnailUrl, platform: data.platform } as VideoBlock);
      }
    } catch (e) { setVideoError(String(e)); }
    setVideoLoading(false);
  }

  const tc = typeColors[block.type] || '#888';

  return (
    <div style={{
      background: '#141414', border: '1px solid #222',
      borderLeft: `3px solid ${tc}`, borderRadius: '10px',
      marginBottom: '10px', overflow: 'hidden',
    }}>
      {/* Block header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '6px',
          background: `${tc}22`, color: tc,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 800, flexShrink: 0,
        }}>
          {typeIcons[block.type]}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: tc, textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>
          {block.type}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Move up"
            style={{ background: 'none', border: '1px solid #333', borderRadius: '5px', padding: '3px 7px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: '#888', fontSize: '12px', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} title="Move down"
            style={{ background: 'none', border: '1px solid #333', borderRadius: '5px', padding: '3px 7px', cursor: index === total - 1 ? 'not-allowed' : 'pointer', color: '#888', fontSize: '12px', opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
          <button onClick={onDelete} title="Delete block"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', color: '#ef4444', fontSize: '12px' }}>✕</button>
        </div>
      </div>

      {/* Block editor body */}
      <div style={{ padding: '12px 14px' }}>

        {/* HEADING */}
        {block.type === 'heading' && (
          <input value={block.text} onChange={e => onChange({ ...block, text: e.target.value })}
            placeholder="Section heading…" style={{ ...inp, fontSize: '16px', fontWeight: 700 }} />
        )}

        {/* TEXT */}
        {block.type === 'text' && (
          <textarea value={block.text} onChange={e => onChange({ ...block, text: e.target.value })}
            placeholder="Write your paragraph here…" rows={4}
            style={{ ...inp, resize: 'vertical', lineHeight: '1.6' }} />
        )}

        {/* IMAGE */}
        {block.type === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={block.url} onChange={e => onChange({ ...block, url: e.target.value })}
                placeholder="Image URL (https://…)" style={{ ...inp, flex: 1 }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', color: '#ccc', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {uploading ? 'Uploading…' : '⬆ Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </div>
            {block.url && (
              <img src={block.url} alt="preview" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px', marginTop: '4px' }} onError={e => (e.currentTarget.style.display = 'none')} />
            )}
            <input value={block.alt} onChange={e => onChange({ ...block, alt: e.target.value })}
              placeholder="Alt text (optional)" style={{ ...inp, fontSize: '12px' }} />
            <input value={block.linkUrl} onChange={e => onChange({ ...block, linkUrl: e.target.value })}
              placeholder="Link URL when clicked (optional)" style={{ ...inp, fontSize: '12px' }} />
          </div>
        )}

        {/* VIDEO */}
        {block.type === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                defaultValue={block.videoUrl}
                onBlur={e => fetchVideoThumbnail(e.target.value)}
                placeholder="YouTube or Vimeo URL…"
                style={{ ...inp, flex: 1 }}
              />
              <button
                onClick={() => {
                  const el = document.querySelector(`[data-videoid="${block.id}"]`) as HTMLInputElement;
                  if (el) fetchVideoThumbnail(el.value);
                }}
                disabled={videoLoading}
                style={{ background: '#a78bfa22', border: '1px solid #a78bfa55', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', color: '#a78bfa', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {videoLoading ? 'Fetching…' : '▶ Fetch'}
              </button>
            </div>
            {/* Hidden input with block id for the fetch button */}
            <input data-videoid={block.id} defaultValue={block.videoUrl} style={{ display: 'none' }} onChange={e => onChange({ ...block, videoUrl: e.target.value } as VideoBlock)} />
            {videoError && <div style={{ fontSize: '12px', color: '#ef4444', padding: '6px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>⚠️ {videoError}</div>}
            {block.thumbnailUrl && (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                <img src={block.thumbnailUrl} alt="thumbnail" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', paddingLeft: '3px' }}>▶</div>
                </div>
                <div style={{ position: 'absolute', top: 6, right: 6, background: '#a78bfa', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', textTransform: 'uppercase' }}>{block.platform}</div>
              </div>
            )}
            <input value={block.caption} onChange={e => onChange({ ...block, caption: e.target.value })}
              placeholder="Caption (optional)" style={{ ...inp, fontSize: '12px' }} />
          </div>
        )}

        {/* BUTTON */}
        {block.type === 'button' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input value={block.label} onChange={e => onChange({ ...block, label: e.target.value })}
              placeholder="Button label (e.g. Watch Now →)" style={inp} />
            <input value={block.href} onChange={e => onChange({ ...block, href: e.target.value })}
              placeholder="Link URL (https://…)" style={{ ...inp, fontSize: '12px' }} />
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <span style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontWeight: 800, fontSize: '13px', padding: '8px 22px', borderRadius: '8px' }}>
                {block.label || 'Button Label'}
              </span>
            </div>
          </div>
        )}

        {/* DIVIDER */}
        {block.type === 'divider' && (
          <div style={{ padding: '6px 0' }}>
            <hr style={{ border: 'none', borderTop: '1px solid #333', margin: 0 }} />
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#555', textAlign: 'center' }}>Horizontal divider</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Add Block toolbar ────────────────────────────────────────────────────────
function AddBlockBar({ onAdd }: { onAdd: (type: Block['type']) => void }) {
  const blocks: { type: Block['type']; label: string; icon: string; color: string }[] = [
    { type: 'heading',  label: 'Heading',  icon: 'H',  color: '#c9a84c' },
    { type: 'text',     label: 'Text',     icon: '¶',  color: '#60a5fa' },
    { type: 'image',    label: 'Image',    icon: '🖼', color: '#22c55e' },
    { type: 'video',    label: 'Video',    icon: '▶',  color: '#a78bfa' },
    { type: 'button',   label: 'Button',   icon: '⬜', color: '#f97316' },
    { type: 'divider',  label: 'Divider',  icon: '—',  color: '#888'    },
  ];
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '12px 0 4px' }}>
      <span style={{ fontSize: '11px', color: '#555', fontWeight: 700, alignSelf: 'center', marginRight: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add:</span>
      {blocks.map(b => (
        <button key={b.type} onClick={() => onAdd(b.type)} style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: `${b.color}15`, border: `1px solid ${b.color}40`,
          borderRadius: '20px', padding: '5px 12px', cursor: 'pointer',
          color: b.color, fontSize: '12px', fontWeight: 600,
          transition: 'all 0.15s',
        }}>
          <span style={{ fontSize: '11px' }}>{b.icon}</span> {b.label}
        </button>
      ))}
    </div>
  );
}

// ─── Live preview ─────────────────────────────────────────────────────────────
function EmailPreview({ subject, blocks }: { subject: string; blocks: Block[] }) {
  return (
    <div style={{ background: '#0a0a0a', padding: '12px', borderRadius: '8px' }}>
      <div style={{
        background: '#111', border: '1px solid #1e1e1e',
        borderTop: '4px solid #c9a84c', borderRadius: '12px',
        overflow: 'hidden', fontSize: '13px',
      }}>
        {/* Mock email header */}
        <div style={{ padding: '20px 24px', textAlign: 'center', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: '22px', marginBottom: '5px' }}>🏆</div>
          <div style={{ fontWeight: 800, color: '#c9a84c', fontSize: '14px' }}>The Winner&apos;s Circle</div>
          <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Private Mastermind Community</div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {subject && (
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{subject}</h2>
          )}

          {blocks.length === 0 && (
            <p style={{ color: '#444', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
              Add blocks to build your email…
            </p>
          )}

          {blocks.map(block => {
            switch (block.type) {
              case 'heading':
                return <div key={block.id} style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px', lineHeight: 1.3 }}>{block.text || <span style={{ color: '#444', fontStyle: 'italic' }}>Heading…</span>}</div>;

              case 'text':
                return <div key={block.id} style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.7, marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{block.text || <span style={{ color: '#444', fontStyle: 'italic' }}>Text…</span>}</div>;

              case 'image':
                return block.url
                  ? <img key={block.id} src={block.url} alt={block.alt} style={{ width: '100%', borderRadius: '6px', display: 'block', marginBottom: '12px' }} onError={e => (e.currentTarget.style.display='none')} />
                  : <div key={block.id} style={{ background: '#1a1a1a', border: '1px dashed #333', borderRadius: '6px', padding: '24px', textAlign: 'center', color: '#444', fontSize: '12px', marginBottom: '12px' }}>🖼 Image will appear here</div>;

              case 'video':
                return (
                  <div key={block.id} style={{ position: 'relative', marginBottom: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    {block.thumbnailUrl
                      ? <>
                          <img src={block.thumbnailUrl} alt="video" style={{ width: '100%', display: 'block' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 36, height: 36, background: 'rgba(0,0,0,0.75)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', paddingLeft: '3px' }}>▶</div>
                          </div>
                          {block.caption && <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', padding: '6px 0 0' }}>{block.caption}</div>}
                        </>
                      : <div style={{ background: '#1a1a1a', border: '1px dashed #a78bfa44', borderRadius: '6px', padding: '24px', textAlign: 'center', color: '#666', fontSize: '12px' }}>▶ Paste a YouTube or Vimeo URL to load thumbnail</div>
                    }
                  </div>
                );

              case 'button':
                return (
                  <div key={block.id} style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontWeight: 800, fontSize: '13px', padding: '10px 24px', borderRadius: '8px' }}>
                      {block.label || 'Button Label'}
                    </span>
                  </div>
                );

              case 'divider':
                return <hr key={block.id} style={{ border: 'none', borderTop: '1px solid #2a2a2a', margin: '14px 0' }} />;

              default: return null;
            }
          })}
        </div>

        {/* Footer CTA */}
        {blocks.length > 0 && (
          <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: '#c9a84c', color: '#0a0a0a', fontWeight: 800, fontSize: '12px', padding: '9px 22px', borderRadius: '8px' }}>
              Open The Winner&apos;s Circle →
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ background: '#0d0d0d', borderTop: '1px solid #1a1a1a', padding: '12px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#555' }}>You&apos;re receiving this as a member of The Winner&apos;s Circle.</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EmailComposer({ tierCounts }: { tierCounts: TierCounts }) {
  const [tier, setTier] = useState('paid');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([
    { id: uid(), type: 'text', text: '' },
  ]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; sent?: number; error?: string } | null>(null);

  const selectedCount = tierCounts[tier as keyof TierCounts] ?? 0;

  const updateBlock = useCallback((id: string, updated: Block) => {
    setBlocks(prev => prev.map(b => b.id === id ? updated : b));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);

  function addBlock(type: Block['type']) {
    const id = uid();
    const newBlock: Block = (() => {
      switch (type) {
        case 'heading':  return { id, type, text: '' };
        case 'text':     return { id, type, text: '' };
        case 'image':    return { id, type, url: '', alt: '', linkUrl: '' };
        case 'video':    return { id, type, videoUrl: '', thumbnailUrl: '', caption: '', platform: '' };
        case 'button':   return { id, type, label: '', href: '' };
        case 'divider':  return { id, type };
      }
    })();
    setBlocks(prev => [...prev, newBlock]);
  }

  async function handleSend() {
    if (!subject.trim()) { setResult({ error: 'Subject line is required.' }); return; }
    if (blocks.length === 0) { setResult({ error: 'Add at least one content block.' }); return; }

    setSending(true);
    setResult(null);
    try {
      const htmlBody = blocksToHtml(blocks);
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subject, htmlBody, tier }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error || 'Send failed' });
      else setResult({ success: true, sent: data.sent });
    } catch (e) { setResult({ error: String(e) }); }
    setSending(false);
  }

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#666', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1200px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>✉️ Email Marketing</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>Visual email builder — send announcements and updates to your members.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── LEFT: Controls ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Recipients */}
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <label style={labelStyle}>Recipients</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {TIER_OPTIONS.map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  background: tier === opt.value ? 'rgba(201,168,76,0.08)' : 'transparent',
                  border: `1px solid ${tier === opt.value ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
                }}>
                  <input type="radio" name="tier" value={opt.value} checked={tier === opt.value} onChange={() => setTier(opt.value)} style={{ accentColor: '#c9a84c' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: tier === opt.value ? opt.color : 'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{opt.desc}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: tier === opt.value ? opt.color : 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
                    {tierCounts[opt.value as keyof TierCounts]}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <label style={labelStyle}>Subject Line</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. 🏆 This Week in The Winner's Circle"
              style={{ width: '100%', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Block editor */}
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <label style={labelStyle}>Email Content</label>

            {blocks.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: '13px', border: '1px dashed #2a2a2a', borderRadius: '8px', marginBottom: '12px' }}>
                No blocks yet — add one below to start building
              </div>
            )}

            {blocks.map((block, i) => (
              <BlockCard
                key={block.id}
                block={block}
                index={i}
                total={blocks.length}
                onChange={updated => updateBlock(block.id, updated)}
                onDelete={() => deleteBlock(block.id)}
                onMove={dir => moveBlock(block.id, dir)}
              />
            ))}

            <AddBlockBar onAdd={addBlock} />
          </div>

          {/* Result */}
          {result && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px',
              background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              fontSize: '14px', color: result.success ? '#22c55e' : '#ef4444',
            }}>
              {result.success
                ? `✅ Sent to ${result.sent} member${result.sent !== 1 ? 's' : ''}!`
                : `⚠️ ${result.error}`}
            </div>
          )}

          {/* Send button */}
          <button onClick={handleSend} disabled={sending || !subject.trim() || blocks.length === 0}
            style={{
              background: sending || !subject.trim() || blocks.length === 0 ? '#5a4a20' : '#c9a84c',
              color: '#0a0a0a', border: 'none', borderRadius: '10px',
              padding: '14px', fontSize: '15px', fontWeight: 800,
              cursor: sending || !subject.trim() || blocks.length === 0 ? 'not-allowed' : 'pointer',
              width: '100%',
            }}>
            {sending ? `Sending to ${selectedCount} members…` : `✉️ Send to ${selectedCount} Member${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* ── RIGHT: Live Preview ─────────────────────────────────── */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Preview</span>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }} />
              <span style={{ fontSize: '11px', color: '#22c55e' }}>Auto-updates</span>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: '12px' }}>
              <EmailPreview subject={subject} blocks={blocks} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
