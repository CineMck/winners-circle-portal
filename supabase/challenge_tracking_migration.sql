-- ============================================================
-- Challenge Progress Tracking Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add tracking columns to the challenges table
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_tasks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS target_metric TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS metric_unit TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completion_threshold INTEGER DEFAULT 80;

-- Create the challenge_checkins table
CREATE TABLE IF NOT EXISTS challenge_checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed JSONB DEFAULT '[]',
  metric_value NUMERIC DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id, check_date)
);

-- Enable RLS
ALTER TABLE challenge_checkins ENABLE ROW LEVEL SECURITY;

-- Users can see checkins for challenges they participate in (for community progress)
CREATE POLICY "view_checkins_for_participants"
  ON challenge_checkins FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM challenge_participations cp
      WHERE cp.challenge_id = challenge_checkins.challenge_id
        AND cp.user_id = auth.uid()
    )
  );

-- Users can only insert their own checkins
CREATE POLICY "insert_own_checkins"
  ON challenge_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own checkins
CREATE POLICY "update_own_checkins"
  ON challenge_checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_checkin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkin_updated_at
  BEFORE UPDATE ON challenge_checkins
  FOR EACH ROW EXECUTE FUNCTION update_checkin_updated_at();
