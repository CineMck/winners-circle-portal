-- ============================================================
-- Winners Circle: Email Campaigns & Templates
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL DEFAULT '',
  subject          TEXT NOT NULL DEFAULT '',
  blocks           JSONB NOT NULL DEFAULT '[]',
  html_body        TEXT DEFAULT '',
  tier             TEXT NOT NULL DEFAULT 'paid',
  status           TEXT NOT NULL DEFAULT 'draft',  -- draft | sent
  sent_at          TIMESTAMPTZ,
  recipient_count  INTEGER DEFAULT 0,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT DEFAULT '',
  blocks       JSONB NOT NULL DEFAULT '[]',
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_campaigns"
  ON email_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "admins_manage_templates"
  ON email_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_created ON email_templates(created_at DESC);
