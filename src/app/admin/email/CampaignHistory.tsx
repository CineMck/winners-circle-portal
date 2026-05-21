'use client';
import { useState } from 'react';
import { type Campaign } from './EmailMarketingShell';
import { type Block } from '@/lib/email/blocks';

interface Props {
  campaigns: Campaign[];
  onRefresh: () => void;
  onEdit: (campaign: Campaign & { blocks?: Block[] }) => void;
  onNewCompose: () => void;
}

const TIER_COLORS: Record<string, string> = {
  all: '#888', paid: '#c9a84c', core: '#c9a84c', elite: '#e0c068', founding: '#ffd700',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function CampaignHistory({ campaigns, onRefresh, onEdit, onNewCompose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'draft'>('all');

  const filtered = campaigns.filter(c => filter === 'all' || c.status === filter);

  async function handleDuplicate(campaign: Campaign) {
    setLoading(campaign.id + '_dup');
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Duplicate failed');
      onRefresh();
    } catch (e) { alert(String(e)); }
    setLoading(null);
  }

  async function handleEdit(campaign: Campaign) {
    setLoading(campaign.id + '_edit');
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`);
      if (!res.ok) throw new Error('Load failed');
      const full = await res.json();
      onEdit(full);
    } catch (e) { alert(String(e)); }
    setLoading(null);
  }

  async function handleDelete(campaign: Campaign) {
    if (!confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return;
    setLoading(campaign.id + '_del');
    try {
      await fetch(`/api/admin/campaigns/${campaign.id}`, { method: 'DELETE' });
      onRefresh();
    } catch (e) { alert(String(e)); }
    setLoading(null);
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'sent', 'draft'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'rgba(201,168,76,0.15)' : 'transparent',
              border: `1px solid ${filter === f ? '#c9a84c66' : 'var(--border)'}`,
              borderRadius: '20px', padding: '5px 14px', cursor: 'pointer',
              color: filter === f ? '#c9a84c' : 'var(--muted)', fontSize: '12px', fontWeight: 700,
              textTransform: 'capitalize',
            }}>
              {f === 'all' ? `All (${campaigns.length})` : f === 'sent' ? `Sent (${campaigns.filter(c => c.status === 'sent').length})` : `Drafts (${campaigns.filter(c => c.status === 'draft').length})`}
            </button>
          ))}
        </div>
        <button onClick={onNewCompose} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: 800 }}>
          + New Campaign
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#444' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#666' }}>No campaigns yet</div>
          <div style={{ fontSize: '13px', marginBottom: '20px' }}>Create and send your first email campaign</div>
          <button onClick={onNewCompose} style={{ background: '#c9a84c', color: '#0a0a0a', border: 'none', borderRadius: '8px', padding: '10px 22px', cursor: 'pointer', fontSize: '13px', fontWeight: 800 }}>
            + Create Campaign
          </button>
        </div>
      )}

      {/* Campaign list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(campaign => {
          const isLoadingEd  = loading === campaign.id + '_edit';
          const isLoadingDup = loading === campaign.id + '_dup';
          const isLoadingDel = loading === campaign.id + '_del';
          const tc = TIER_COLORS[campaign.tier] || '#888';

          return (
            <div key={campaign.id} style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Status dot + name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {/* Status badge */}
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px',
                    background: campaign.status === 'sent' ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
                    color: campaign.status === 'sent' ? '#22c55e' : '#fbbf24',
                    border: `1px solid ${campaign.status === 'sent' ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  }}>
                    {campaign.status === 'sent' ? '✓ Sent' : '⚪ Draft'}
                  </span>
                  {/* Tier badge */}
                  <span style={{ fontSize: '10px', fontWeight: 700, color: tc, background: `${tc}18`, padding: '2px 7px', borderRadius: '8px' }}>
                    {campaign.tier}
                  </span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {campaign.name || campaign.subject}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {campaign.subject !== campaign.name && campaign.subject ? `${campaign.subject} · ` : ''}
                  {campaign.status === 'sent' && campaign.sent_at
                    ? `Sent ${formatDate(campaign.sent_at)} · ${campaign.recipient_count ?? 0} recipients`
                    : `Created ${timeAgo(campaign.created_at)}`
                  }
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => handleEdit(campaign)} disabled={isLoadingEd}
                  title="Edit / Open in composer"
                  style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer', color: '#ccc', fontSize: '12px', fontWeight: 600 }}>
                  {isLoadingEd ? '…' : '✏️ Edit'}
                </button>
                <button onClick={() => handleDuplicate(campaign)} disabled={isLoadingDup}
                  title="Duplicate as new draft"
                  style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer', color: '#60a5fa', fontSize: '12px', fontWeight: 600 }}>
                  {isLoadingDup ? '…' : '⧉ Copy'}
                </button>
                <button onClick={() => handleDelete(campaign)} disabled={isLoadingDel}
                  title="Delete"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', padding: '6px 10px', cursor: 'pointer', color: '#ef4444', fontSize: '12px' }}>
                  {isLoadingDel ? '…' : '🗑'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
