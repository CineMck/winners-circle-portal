/**
 * Minimal iCalendar (.ics) generator for the RE Mastermind Zoom calls.
 * Returns a string you can attach to a Resend email (base64) so registrants
 * can add the call to their calendar.
 */
function fmt(d: Date): string {
  // UTC basic format: 20260617T160000Z
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(opts: {
  uid: string;
  title: string;
  description?: string;
  startsAt: Date;
  durationMinutes?: number;
  url?: string;
}): string {
  const start = opts.startsAt;
  const end = new Date(start.getTime() + (opts.durationMinutes ?? 60) * 60_000);
  const desc = (opts.description || '') + (opts.url ? `\\n\\nJoin: ${opts.url}` : '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Winners Circle//RE Mastermind//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escapeIcs(opts.title)}`,
    `DESCRIPTION:${escapeIcs(desc)}`,
    ...(opts.url ? [`URL:${escapeIcs(opts.url)}`, `LOCATION:${escapeIcs(opts.url)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
