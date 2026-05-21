-- ============================================================
-- Winners Circle: AI Agent Reports
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary_text    TEXT NOT NULL,
  suggested_outreach JSONB NOT NULL DEFAULT '[]',
  -- each item: { userId, full_name, type: "props"|"encourage", reason, message, approved: null|true|false, sent: false }
  command_log     JSONB NOT NULL DEFAULT '[]',
  -- each item: { role: "user"|"agent", content, timestamp }
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending | approved | sent | skipped
  sent_at         TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'
);

ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_agent_reports"
  ON agent_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE INDEX IF NOT EXISTS idx_agent_reports_generated_at ON agent_reports(generated_at DESC);
