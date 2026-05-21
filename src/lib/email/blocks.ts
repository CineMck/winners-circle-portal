// Shared email block types and HTML generation
// Used by the editor, API routes, and preview components

export type HeadingBlock = { id: string; type: 'heading'; text: string };
export type TextBlock    = { id: string; type: 'text';    text: string };
export type ImageBlock   = { id: string; type: 'image';   url: string; alt: string; linkUrl: string };
export type VideoBlock   = { id: string; type: 'video';   videoUrl: string; thumbnailUrl: string; caption: string; platform: string };
export type ButtonBlock  = { id: string; type: 'button';  label: string; href: string };
export type DividerBlock = { id: string; type: 'divider' };
export type SpacerBlock  = { id: string; type: 'spacer';  size: 'sm' | 'md' | 'lg' };

export type Block = HeadingBlock | TextBlock | ImageBlock | VideoBlock | ButtonBlock | DividerBlock | SpacerBlock;

export const BLOCK_TYPES: { type: Block['type']; label: string; icon: string; color: string }[] = [
  { type: 'heading', label: 'Heading',  icon: 'H',  color: '#c9a84c' },
  { type: 'text',    label: 'Text',     icon: '¶',  color: '#60a5fa' },
  { type: 'image',   label: 'Image',    icon: '🖼', color: '#22c55e' },
  { type: 'video',   label: 'Video',    icon: '▶',  color: '#a78bfa' },
  { type: 'button',  label: 'Button',   icon: '⬜', color: '#f97316' },
  { type: 'divider', label: 'Divider',  icon: '—',  color: '#888'    },
  { type: 'spacer',  label: 'Spacer',   icon: '↕',  color: '#555'    },
];

export const BLOCK_COLORS: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map(b => [b.type, b.color]));
export const BLOCK_ICONS:  Record<string, string> = Object.fromEntries(BLOCK_TYPES.map(b => [b.type, b.icon]));

export function makeBlock(type: Block['type']): Block {
  const id = Math.random().toString(36).slice(2, 10);
  switch (type) {
    case 'heading':  return { id, type, text: '' };
    case 'text':     return { id, type, text: '' };
    case 'image':    return { id, type, url: '', alt: '', linkUrl: '' };
    case 'video':    return { id, type, videoUrl: '', thumbnailUrl: '', caption: '', platform: '' };
    case 'button':   return { id, type, label: '', href: '' };
    case 'divider':  return { id, type };
    case 'spacer':   return { id, type, size: 'md' };
  }
}

function esc(s: string)     { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escA(s: string)    { return s.replace(/"/g,'&quot;'); }

export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading':
        return `<h2 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">${esc(b.text)}</h2>`;

      case 'text':
        return `<p style="margin:0 0 16px;font-size:15px;color:#cccccc;line-height:1.7;">${esc(b.text).replace(/\n/g,'<br>')}</p>`;

      case 'image': {
        const img = `<img src="${escA(b.url)}" alt="${escA(b.alt)}" width="100%" style="display:block;width:100%;border-radius:8px;margin-bottom:16px;" />`;
        return b.linkUrl ? `<a href="${escA(b.linkUrl)}" target="_blank" style="display:block;">${img}</a>` : img;
      }

      case 'video': {
        if (!b.thumbnailUrl) return '';
        return `<div style="position:relative;margin-bottom:16px;">
  <a href="${escA(b.videoUrl)}" target="_blank" style="display:block;position:relative;">
    <img src="${escA(b.thumbnailUrl)}" width="100%" alt="${escA(b.caption||'Watch video')}" style="display:block;width:100%;border-radius:8px;" />
    <table width="60" cellpadding="0" cellspacing="0" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
      <tr><td align="center" valign="middle" style="width:60px;height:60px;background:rgba(0,0,0,0.72);border-radius:50%;">
        <span style="color:#fff;font-size:22px;padding-left:4px;">&#9654;</span>
      </td></tr>
    </table>
  </a>
  ${b.caption ? `<p style="margin:8px 0 0;font-size:13px;color:#888;text-align:center;">${esc(b.caption)}</p>` : ''}
</div>`;
      }

      case 'button':
        return `<div style="text-align:center;margin-bottom:20px;"><a href="${escA(b.href)}" target="_blank" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">${esc(b.label)}</a></div>`;

      case 'divider':
        return `<hr style="border:none;border-top:1px solid #2a2a2a;margin:20px 0;" />`;

      case 'spacer': {
        const h = b.size === 'sm' ? 16 : b.size === 'lg' ? 48 : 32;
        return `<div style="height:${h}px;"></div>`;
      }

      default: return '';
    }
  }).join('\n');
}

export function wrapInEmailTemplate(subject: string, body: string, appUrl: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#111;border:1px solid #1e1e1e;border-top:4px solid #c9a84c;border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
  <div style="font-size:32px;margin-bottom:8px;">🏆</div>
  <div style="font-size:20px;font-weight:800;color:#c9a84c;">The Winner's Circle</div>
  <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Private Mastermind Community</div>
</td></tr>
<tr><td style="background:#111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;padding:32px 36px;">${body}</td></tr>
<tr><td style="background:#111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;padding:0 36px 32px;text-align:center;">
  <a href="${appUrl}/home" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Open The Winner's Circle →</a>
</td></tr>
<tr><td style="background:#0d0d0d;border:1px solid #1e1e1e;border-top:1px solid #1a1a1a;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#555;">You're receiving this as a member of The Winner's Circle.<br/>
  <a href="${appUrl}/profile" style="color:#888;text-decoration:underline;">Manage your account</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}
