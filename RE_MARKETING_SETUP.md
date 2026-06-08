# Real Estate RSVP + marketing + reminders — setup

What was built:
- **RSVP fix:** registrants now get a **confirmation email with the Zoom link + a calendar (.ics) invite**; the host still gets a notification.
- **Call Sessions** (admin → Call Sessions): manage each Zoom call's label, date/time, and link. The registration form, confirmation email, and reminders all read from these.
- **RE Marketing List** (admin → RE Marketing List): every RSVP, searchable, with CSV export + unsubscribe status.
- **Email panel:** the composer has a new **"RE RSVP List"** audience that sends to registrants (excludes unsubscribed, dedupes, adds an unsubscribe footer).
- **Unsubscribe:** `/unsubscribe?token=…` + footer link on RE emails.
- **Reminders:** registrants are emailed **24h before, 1h before, and at start**.

## 1. Run the SQL (Supabase SQL Editor)
```
supabase/re_marketing.sql
```
Adds `re_call_sessions`, the marketing/reminder columns on `re_mastermind_registrations`, and admin RLS. Safe to re-run.

## 2. Create your call sessions
Admin → **Call Sessions** → add each call (label shown to registrants, start date/time, Zoom link). The `/real-estate` form shows active, future sessions automatically. Without at least one active session, the form shows "new dates coming soon."

## 3. Schedule the reminder cron
The reminder endpoint is idempotent and fail-closed. Point a scheduler at it **every ~15 minutes**:
```
POST https://winnerscircleportal.com/api/real-estate/reminders
Header: x-cron-secret: $CRON_SECRET
```
Use Railway Cron or a Supabase scheduled function. Requires the existing `CRON_SECRET` env var (same one used by event reminders).

## 4. Email deliverability (important)
All of this sends through Resend. Confirm your **sending domain is verified in Resend** and `RESEND_FROM_EMAIL` uses that domain (e.g. `noreply@wentworthre.com`). With the default `onboarding@resend.dev`, Resend only delivers to your own address — which is likely why test RSVPs got nothing. This is the #1 thing to verify.

## Flow summary
1. Visitor RSVPs on `/real-estate` → row in `re_mastermind_registrations` + confirmation email w/ Zoom link + .ics.
2. They appear in admin → RE Marketing List (export CSV anytime).
3. Send campaigns to them via Email Marketing → audience "RE RSVP List".
4. They get reminders 24h/1h/at-start automatically (once the cron is scheduled).
5. Any recipient can unsubscribe via the footer link; they're then excluded from list sends and reminders.

## Notes
- Reminders/marketing only target registrants tied to a call **session** (new RSVPs). Pre-existing rows without a `session_id` won't get reminders.
- The list-send unsubscribe footer is per-recipient; member-tier campaigns are unchanged.
