'use client';
import { useState } from 'react';
import { type Block } from '@/lib/email/blocks';
import EmailComposer from './EmailComposer';
import CampaignHistory from './CampaignHistory';
import TemplateLibrary from './TemplateLibrary';

interface TierCounts { all: number; paid: number; core: number; elite: number; founding: number }

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  tier: string;
  status: 'draft' | 'sent';
  sent_at: string | null;
  recipient_count: number | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  blocks: Block[];
  created_at: string;
}

interface Props {
  tierCounts: TierCounts;
  initialCampaigns: Campaign[];
  initialTemplates: EmailTemplate[];
}

type Tab = 'compose' | 'history' | 'templates';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'compose',   label: 'Compose',   icon: '✏️' },
  { id: 'history',   label: 'Campaigns', icon: '📋' },
  { id: 'templates', label: 'Templates', icon: '📄' },
];

export default function EmailMarketingShell({ tierCounts, initialCampaigns, initialTemplates }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);

  // Composer state — can be seeded from a campaign or template
  const [composerKey, setComposerKey] = useState(0); // increment to reset composer
  const [seedBlocks, setSeedBlocks]   = useState<Block[] | undefined>(undefined);
  const [seedSubject, setSeedSubject] = useState<string | undefined>(undefined);
  const [seedName, setSeedName]       = useState<string | undefined>(undefined);
  const [seedTier, setSeedTier]       = useState<string | undefined>(undefined);
  const [seedCampaignId, setSeedCampaignId] = useState<string | undefined>(undefined);

  function openCampaignInComposer(campaign: Campaign & { blocks?: Block[] }) {
    setSeedBlocks(campaign.blocks);
    setSeedSubject(campaign.subject);
    setSeedName(campaign.name);
    setSeedTier(campaign.tier);
    setSeedCampaignId(campaign.id);
    setComposerKey(k => k + 1);
    setActiveTab('compose');
  }

  function openTemplateInComposer(template: EmailTemplate) {
    setSeedBlocks(template.blocks);
    setSeedSubject(undefined);
    setSeedName(undefined);
    setSeedTier(undefined);
    setSeedCampaignId(undefined);
    setComposerKey(k => k + 1);
    setActiveTab('compose');
  }

  function newCompose() {
    setSeedBlocks(undefined);
    setSeedSubject(undefined);
    setSeedName(undefined);
    setSeedTier(undefined);
    setSeedCampaignId(undefined);
    setComposerKey(k => k + 1);
    setActiveTab('compose');
  }

  async function refreshCampaigns() {
    const res = await fetch('/api/admin/campaigns');
    if (res.ok) setCampaigns(await res.json());
  }

  async function refreshTemplates() {
    const res = await fetch('/api/admin/templates');
    if (res.ok) setTemplates(await res.json());
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>✉️ Email Marketing</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0' }}>
          Build, send, and manage email campaigns for your members.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#c9a84c' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? '2px solid #c9a84c' : '2px solid transparent',
              marginBottom: '-1px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.15s',
            }}
          >
            {tab.icon} {tab.label}
            {tab.id === 'history' && campaigns.length > 0 && (
              <span style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', borderRadius: '10px', fontSize: '11px', fontWeight: 700, padding: '1px 7px' }}>
                {campaigns.length}
              </span>
            )}
            {tab.id === 'templates' && templates.length > 0 && (
              <span style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', borderRadius: '10px', fontSize: '11px', fontWeight: 700, padding: '1px 7px' }}>
                {templates.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'compose' && (
        <EmailComposer
          key={composerKey}
          tierCounts={tierCounts}
          initialBlocks={seedBlocks}
          initialSubject={seedSubject}
          initialName={seedName}
          initialTier={seedTier}
          campaignId={seedCampaignId}
          onSaved={refreshCampaigns}
          onTemplateSaved={refreshTemplates}
        />
      )}

      {activeTab === 'history' && (
        <CampaignHistory
          campaigns={campaigns}
          onRefresh={refreshCampaigns}
          onEdit={openCampaignInComposer}
          onNewCompose={newCompose}
        />
      )}

      {activeTab === 'templates' && (
        <TemplateLibrary
          templates={templates}
          onRefresh={refreshTemplates}
          onUse={openTemplateInComposer}
          onNewCompose={newCompose}
        />
      )}
    </div>
  );
}
