'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, getTierColor, getTierLabel } from '@/types';

interface Category { id: string; name: string; }
interface Resource { id: string; title: string; description?: string; file_url?: string; file_type?: string; file_size_bytes?: number; category_id?: string; tier_required: string; download_count: number; category?: { name: string }; }
interface Props { profile: Profile; categories: Category[]; resources: Resource[]; }

const TIER_ORDER: Record<string, number> = { free: 0, core: 1, elite: 2, founding: 3 };
function canAccess(userTier: string, required: string) { return (TIER_ORDER[userTier] ?? 0) >= (TIER_ORDER[required] ?? 0); }

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
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

export default function ResourcesPage({ profile, categories, resources }: Props) {
  const supabase = createClient();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = resources.filter(r => {
    const matchCat = activeCategory === 'all' || r.category_id === activeCategory;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  async function handleDownload(resource: Resource) {
    if (!canAccess(profile?.tier, resource.tier_required)) return;
    if (!resource.file_url) return;
    // Increment download count
    await supabase.from('resources').update({ download_count: resource.download_count + 1 }).eq('id', resource.id);
    window.open(resource.file_url, '_blank');
  }

  return (
    <div style={{ maxWidth: '900px', padding: '32px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>📚 Resource Library</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>Templates, guides, and tools to help you win.</p>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
          style={{ flex: 1, minWidth: '200px', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text)', fontSize: '14px', outline: 'none' }} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[{ id: 'all', name: 'All' }, ...categories].map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${activeCategory === cat.id ? 'var(--gold)' : 'var(--border)'}`, background: activeCategory === cat.id ? 'var(--gold-dim)' : 'none', color: activeCategory === cat.id ? 'var(--gold)' : 'var(--muted)' }}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{resources.length === 0 ? 'No resources yet — check back soon.' : 'No results for your search.'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(r => {
          const accessible = canAccess(profile?.tier, r.tier_required);
          const tierColor = getTierColor(r.tier_required as 'free'|'core'|'elite'|'founding');
          return (
            <div key={r.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', opacity: accessible ? 1 : 0.65 }}>
              <span style={{ fontSize: '32px', flexShrink: 0 }}>{fileIcon(r.file_type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700 }}>{r.title}</span>
                  {r.tier_required !== 'free' && (
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', border: `1px solid ${tierColor}`, color: tierColor, fontWeight: 600 }}>
                      {accessible ? '' : '🔒 '}{getTierLabel(r.tier_required as 'free'|'core'|'elite'|'founding')}+
                    </span>
                  )}
                </div>
                {r.description && <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 4px', lineHeight: 1.5 }}>{r.description}</p>}
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {r.category?.name && <span>{r.category.name} · </span>}
                  {formatBytes(r.file_size_bytes)}{r.download_count > 0 ? ` · ${r.download_count} downloads` : ''}
                </div>
              </div>
              {accessible ? (
                <button onClick={() => handleDownload(r)} className="btn-gold" style={{ padding: '9px 18px', fontSize: '13px', flexShrink: 0 }}>
                  ⬇ Download
                </button>
              ) : (
                <a href="/upgrade" style={{ padding: '9px 18px', fontSize: '13px', background: 'var(--gold)', color: '#0a0a0a', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                  Upgrade
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
