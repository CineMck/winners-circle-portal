-- Track when a member accepted the Terms of Service & Privacy Policy.
-- Required for legal compliance & audit trail.

alter table profiles add column if not exists terms_accepted_at timestamptz null;
alter table profiles add column if not exists terms_version text null;

comment on column profiles.terms_accepted_at is
  'Timestamp the member checked the Terms & Privacy agreement during signup.';
comment on column profiles.terms_version is
  'Which version of the Terms they agreed to (e.g. "2026-06-04"). Bump when material changes are made.';
