-- ============================================================
-- Winners Circle: Member Admin Enhancements
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add referral_code to profiles (unique short code per member)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_comped BOOLEAN DEFAULT FALSE;

-- Address fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country TEXT;

-- Generate referral codes for existing members who don't have one
UPDATE profiles
SET referral_code = 'WC-' || UPPER(SUBSTRING(MD5(id::text || random()::text), 1, 6))
WHERE referral_code IS NULL;

-- Allow admins to read all referrals
CREATE POLICY IF NOT EXISTS "admins_view_all_referrals"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Index for faster referral lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
