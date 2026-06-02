import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUsers } from '@/lib/push';

/**
 * Cron endpoint — sends a push to every RSVP'd attendee 1 hour before an event starts.
 *
 * Configure as a Supabase Scheduled Function or external cron (Vercel Cron, Railway
 * cron job) to hit this URL every 5 minutes:
 *   POST https://.../api/push/event-reminders
 *   Header: x-cron-secret: ${CRON_SECRET}
 *
 * The endpoint is idempotent — it sets `reminder_sent_at` on each event after sending.
 *
 * Assumes:
 *   events: { id, title, starts_at timestamptz, reminder_sent_at timestamptz null }
 *   event_rsvps: { event_id, user_id, status }
 * If your column names differ, adjust the queries below.
 */
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = adminClient();
  const now = new Date();
  // Events starting in the next 60–65 minutes that haven't been notified yet
  const windowStart = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, starts_at, reminder_sent_at')
    .gte('starts_at', windowStart)
    .lte('starts_at', windowEnd)
    .is('reminder_sent_at', null);

  if (error) {
    console.error('event-reminders query error:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  if (!events || events.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let totalSent = 0;
  for (const event of events) {
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('user_id')
      .eq('event_id', event.id)
      .eq('status', 'going');
    const userIds = (rsvps || []).map((r) => r.user_id);
    if (userIds.length === 0) continue;

    const result = await sendPushToUsers(userIds, {
      title: 'Starting soon',
      body: `${event.title} starts in 1 hour.`,
      url: `/events/${event.id}`,
      data: { eventId: String(event.id), kind: 'event-reminder' },
    });
    totalSent += result.sent;

    await supabase
      .from('events')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', event.id);
  }

  return NextResponse.json({ ok: true, events: events.length, sent: totalSent });
}
