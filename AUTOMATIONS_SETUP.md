# Email/SMS Automations (drip nurture) — setup

A step-based drip engine that nurtures RE leads into paying members across email
+ SMS, with exit-on-conversion. Admin → **Automations**.

## How it works
- A **new RE RSVP** is auto-enrolled into the active sequence (trigger `re_rsvp`).
- Each **step** waits a delay, then sends an **email** (Resend) or **SMS** (Twilio).
- A lead **exits automatically** the moment they become a paying member
  (`core/elite/founding/re_promo`) — buyers never get "become a member" emails.
- Email respects email unsubscribe; SMS only sends to contacts who **opted in** and
  haven't texted STOP.
- A seeded **"RE Lead Nurture"** sequence ships **inactive** — review/edit, then activate.

## 1. Run the SQL
```
supabase/automations.sql
```
Creates `email_sequences`, `sequence_steps`, `sequence_enrollments`, adds
`sms_consent`/`sms_opt_out` to the RSVP table, and seeds the recommended sequence
(welcome → value → offer → SMS nudge → urgency → re-engage). Safe to re-run.

## 2. Schedule the engine cron (every ~15 min)
```
POST https://winnerscircleportal.com/api/automations/run
Header: x-cron-secret: $CRON_SECRET
```
Same `CRON_SECRET` as your other crons. Without this scheduled, no drip steps send.

## 3. Activate + edit the sequence
Admin → **Automations** → review the steps (edit subject/body/delay/channel, add/remove
steps), then flip the sequence to **Active**. Use `{{first_name}}` in email/SMS for
personalization.

## 4. Twilio SMS setup (required before SMS will work)
SMS no-ops until Twilio is configured. Env vars (Railway):
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_SID=MG...      # recommended (A2P 10DLC), OR:
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```
Then in Twilio, set the **inbound message webhook** for your number / messaging service to:
```
https://winnerscircleportal.com/api/twilio/inbound
```
This records STOP opt-outs in our list (Twilio also enforces STOP at the carrier level).

### ⚠️ Compliance — do this, it's not optional
- **A2P 10DLC registration**: US business SMS requires registering a Brand + Campaign
  in Twilio. Until approved, carriers filter/block your texts. Approval takes days.
- **Consent**: the RSVP form now has an SMS opt-in checkbox; we only text contacts who
  checked it. Don't bulk-text people who didn't opt in (TCPA).
- **Opt-out**: STOP is honored automatically + recorded. Keep "Reply STOP to opt out"
  in marketing texts (the seeded SMS step includes it).
- Watch quiet hours and frequency.

## Notes
- Email deliverability still depends on a verified Resend domain (`RESEND_FROM_EMAIL`).
- Only RSVPs created after this is live (with a `session_id`) are enrolled.
- Call reminders (24h/1h/at-start) are separate and now also send SMS to opted-in
  registrants once Twilio is configured.
- This is v1 (linear drip). Branching/conditional logic can be added later if needed.
