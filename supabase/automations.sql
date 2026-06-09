-- ============================================================
-- Email/SMS automation (drip) sequences. Run once in Supabase SQL editor.
-- Safe to re-run (idempotent). Seeds a recommended RE lead-nurture sequence.
-- ============================================================

-- SMS consent + opt-out on the RSVP/marketing list.
alter table re_mastermind_registrations
  add column if not exists sms_consent  boolean not null default false,
  add column if not exists sms_opt_out  boolean not null default false;

create table if not exists email_sequences (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  trigger    text not null default 're_rsvp',   -- enrollment trigger
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sequence_steps (
  id           uuid primary key default gen_random_uuid(),
  sequence_id  uuid not null references email_sequences(id) on delete cascade,
  step_order   int  not null,
  delay_minutes int not null default 0,         -- wait (from previous step) before sending
  channel      text not null default 'email',   -- 'email' | 'sms'
  subject      text default '',                 -- email only
  body         text not null default '',        -- email inner HTML, or SMS text
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists sequence_enrollments (
  id              uuid primary key default gen_random_uuid(),
  sequence_id     uuid not null references email_sequences(id) on delete cascade,
  registration_id uuid references re_mastermind_registrations(id) on delete cascade,
  email           text not null,
  phone           text,
  current_step    int not null default 0,
  status          text not null default 'active', -- active | completed | exited
  next_run_at     timestamptz not null default now(),
  enrolled_at     timestamptz not null default now(),
  last_sent_at    timestamptz,
  unique (sequence_id, registration_id)
);

alter table email_sequences      enable row level security;
alter table sequence_steps       enable row level security;
alter table sequence_enrollments enable row level security;
drop policy if exists "admins_manage_sequences" on email_sequences;
create policy "admins_manage_sequences" on email_sequences for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));
drop policy if exists "admins_manage_steps" on sequence_steps;
create policy "admins_manage_steps" on sequence_steps for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));
drop policy if exists "admins_manage_enrollments" on sequence_enrollments;
create policy "admins_manage_enrollments" on sequence_enrollments for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','moderator')));

create index if not exists seq_enroll_due_idx on sequence_enrollments(status, next_run_at);
create index if not exists seq_steps_seq_idx on sequence_steps(sequence_id, step_order);

-- ── Seed: recommended RE lead-nurture sequence (inactive until you turn it on) ──
do $$
declare sid uuid;
begin
  if not exists (select 1 from email_sequences where name = 'RE Lead Nurture') then
    insert into email_sequences (name, trigger, is_active) values ('RE Lead Nurture', 're_rsvp', false) returning id into sid;
    insert into sequence_steps (sequence_id, step_order, delay_minutes, channel, subject, body) values
    (sid, 1, 60,   'email', 'Welcome to The Winners Circle 👋',
      '<p>Hi {{first_name}},</p><p>Thanks for registering. The Winners Circle is John Wentworth''s mastermind for real estate pros who want to scale without burning out. Over the next few days I''ll share a few things that move the needle most — and how to go deeper if you want.</p><p>See you on the call.</p>'),
    (sid, 2, 1440, 'email', 'The #1 thing that separates 7-figure agents',
      '<p>Hi {{first_name}},</p><p>Most agents plateau because their business depends entirely on them. The ones who break through build <strong>systems, accountability, and a room of people playing at a higher level</strong>. That''s exactly what the Circle is built around.</p>'),
    (sid, 3, 2880, 'email', 'Your 50% promo is open — first 4 months for $300',
      '<p>Hi {{first_name}},</p><p>As a thank-you for joining the mastermind call, you can start your full membership at <strong>50% off your first 4 months — $300 total (normally $600), then $150/mo</strong>.</p><p style="text-align:center;margin:24px 0;"><a href="https://winnerscircleportal.com/real-estate/join" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;text-decoration:none;padding:14px 30px;border-radius:10px;">Become a member →</a></p>'),
    (sid, 4, 2880, 'sms',   '',
      'John here — your Winners Circle promo (50% off your first 4 months) is still open: https://winnerscircleportal.com/real-estate/join  Reply STOP to opt out.'),
    (sid, 5, 2880, 'email', 'Spots are filling — promo closing soon',
      '<p>Hi {{first_name}},</p><p>Quick heads up: the 50%-off promo won''t be around forever. If you''ve been on the fence, now''s the time to lock in $300 for your first 4 months.</p><p style="text-align:center;margin:24px 0;"><a href="https://winnerscircleportal.com/real-estate/join" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;text-decoration:none;padding:14px 30px;border-radius:10px;">Claim the promo →</a></p>'),
    (sid, 6, 4320, 'email', 'Still thinking it over?',
      '<p>Hi {{first_name}},</p><p>Just checking in — is there anything holding you back from joining? Reply to this email and tell me; I read every one. And if the timing isn''t right, no worries at all.</p>');
  end if;
end $$;
