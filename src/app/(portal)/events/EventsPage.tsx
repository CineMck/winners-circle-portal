'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, getTierColor, getTierLabel } from '@/types';

interface Event {
  id: string; title: string; description?: string; zoom_link?: string;
  recording_url?: string; starts_at: string; duration_minutes: number;
  tier_required: string; rsvp_count?: { count: number }[];
}

interface Props { profile: Profile; events: Event[]; myRsvpIds: string[]; }

const TIER_ORDER: Record<string, number> = { free: 0, re_promo: 0, core: 1, elite: 2, founding: 3 };
function canAccess(userTier: string, required: string) {
  // Real Estate Promo events: promo members only (plus 1-1 Elite, so John
  // and top-tier members can still see/join those sessions).
  if (required === 're_promo') return userTier === 're_promo' || userTier === 'founding';
  return (TIER_ORDER[userTier] ?? 0) >= (TIER_ORDER[required] ?? 0);
}

// ── Calendar helpers ──────────────────────────────────────────────────────────
function toCalDate(iso: string) {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', 'Z');
}

function googleCalendarUrl(ev: Event) {
  const start = new Date(ev.starts_at);
  const end = new Date(start.getTime() + ev.duration_minutes * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: [ev.description || '', ev.zoom_link ? `\nJoin Zoom: ${ev.zoom_link}` : ''].join(''),
    location: ev.zoom_link || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(ev: Event) {
  const start = new Date(ev.starts_at);
  const end = new Date(start.getTime() + ev.duration_minutes * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const uid = `${ev.id}@winnerscircle`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Winners Circle//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}${ev.zoom_link ? `\\nJoin: ${ev.zoom_link}` : ''}`,
    `LOCATION:${ev.zoom_link || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ev.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Remind Me popover ─────────────────────────────────────────────────────────
function RemindMeButton({ ev }: { ev: Event }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '9px 16px', fontSize: '13px', borderRadius: '8px',
          cursor: 'pointer', border: '1px solid #3a3a3a',
          background: open ? '#1e1e1e' : 'transparent',
          color: '#ccc', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}
      >
        🔔 Remind Me
        <span style={{ fontSize: '10px', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          borderRadius: '10px', padding: '6px', zIndex: 50,
          minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <a
            href={googleCalendarUrl(ev)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '7px',
              color: 'var(--text)', textDecoration: 'none', fontSize: '13px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '16px' }}>📅</span>
            <div>
              <div style={{ fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Opens in new tab</div>
            </div>
          </a>
          <button
            onClick={() => { downloadIcs(ev); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '7px', width: '100%',
              color: 'var(--text)', background: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: '13px', textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '16px' }}>📥</span>
            <div>
              <div style={{ fontWeight: 600 }}>Apple / Outlook (.ics)</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Downloads calendar file</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EventsPage({ profile, events, myRsvpIds }: Props) {
  const supabase = createClient();
  const [rsvps, setRsvps] = useState<Set<string>>(new Set(myRsvpIds));
  const [loading, setLoading] = useState<string | null>(null);

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.starts_at) >= now);
  const past = events.filter(e => new Date(e.starts_at) < now);

  async function toggleRsvp(eventId: string) {
    if (!canAccess(profile?.tier, events.find(e => e.id === eventId)?.tier_required || 'free')) return;
    setLoading(eventId);
    if (rsvps.has(eventId)) {
      await supabase.from('event_rsvps').delete().match({ event_id: eventId, user_id: profile.id });
      setRsvps(prev => { const s = new Set(prev); s.delete(eventId); return s; });
    } else {
      await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: profile.id });
      setRsvps(prev => new Set([...prev, eventId]));
    }
    setLoading(null);
  }

  function EventCard({ ev }: { ev: Event }) {
    const d = new Date(ev.starts_at);
    const isPast = d < now;
    const accessible = canAccess(profile?.tier, ev.tier_required);
    const isRsvped = rsvps.has(ev.id);
    const rsvpCount = ev.rsvp_count?.[0]?.count || 0;
    const tierColor = getTierColor(ev.tier_required as 'free'|'core'|'elite'|'founding'|'re_promo');
    const endsAt = new Date(d.getTime() + ev.duration_minutes * 60000);
    const isLive = now >= d && now <= endsAt;

    return (
      <div className="card" style={{ padding: '20px', opacity: !accessible ? 0.65 : 1 }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

          {/* Date block */}
          <div style={{
            background: '#161616',
            border: `1px solid ${isLive ? '#22c55e' : '#2a2a2a'}`,
            borderRadius: '10px', padding: '10px 14px',
            textAlign: 'center', flexShrink: 0, minWidth: '60px',
          }}>
            {isLive && (
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                LIVE
              </div>
            )}
            <div style={{ fontSize: '22px', fontWeight: 800, color: isLive ? '#22c55e' : '#c9a84c' }}>
              {d.getDate()}
            </div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
              {d.toLocaleString('en', { month: 'short' })}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{ev.title}</h3>
              {ev.tier_required !== 'free' && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${tierColor}`, color: tierColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {accessible ? '' : '🔒 '}{getTierLabel(ev.tier_required as 'free'|'core'|'elite'|'founding'|'re_promo')}{ev.tier_required === 're_promo' ? '' : '+'}
                </span>
              )}
            </div>

            <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
              {d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ev.duration_minutes} min
              {rsvpCount > 0 && ` · ${rsvpCount} attending`}
            </div>

            {ev.description && (
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 14px', lineHeight: 1.6 }}>{ev.description}</p>
            )}

            {/* ── Action buttons ── */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

              {/* LIVE: big join button */}
              {isLive && ev.zoom_link && accessible && (
                <a
                  href={ev.zoom_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '10px 22px', fontSize: '14px', fontWeight: 800,
                    background: '#22c55e', color: '#0a0a0a', borderRadius: '8px',
                    textDecoration: 'none', animation: 'pulse 2s infinite',
                  }}
                >
                  🔴 Join Live Now
                </a>
              )}

              {/* UPCOMING: RSVP button */}
              {!isPast && accessible && !isLive && (
                <button
                  onClick={() => toggleRsvp(ev.id)}
                  disabled={loading === ev.id}
                  style={{
                    padding: '9px 18px', fontSize: '13px', borderRadius: '8px',
                    cursor: loading === ev.id ? 'not-allowed' : 'pointer',
                    border: isRsvped ? '1px solid rgba(239,68,68,0.5)' : '1px solid #c9a84c',
                    background: isRsvped ? 'rgba(239,68,68,0.1)' : 'rgba(201,168,76,0.12)',
                    color: isRsvped ? '#ef4444' : '#c9a84c',
                    fontWeight: 700,
                  }}
                >
                  {loading === ev.id ? '…' : isRsvped ? '✓ RSVPed · Cancel' : '+ RSVP'}
                </button>
              )}

              {/* UPCOMING: Join Zoom Call button — shown when zoom_link is set */}
              {!isPast && !isLive && ev.zoom_link && accessible && (
                <a
                  href={ev.zoom_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '9px 18px', fontSize: '13px', fontWeight: 700,
                    background: 'rgba(96,165,250,0.12)',
                    border: '1px solid rgba(96,165,250,0.45)',
                    color: '#60a5fa', borderRadius: '8px',
                    textDecoration: 'none',
                  }}
                >
                  🎥 Join Zoom Call
                </a>
              )}

              {/* UPCOMING: Remind Me */}
              {!isPast && !isLive && accessible && (
                <RemindMeButton ev={ev} />
              )}

              {/* PAST: Recording */}
              {isPast && ev.recording_url && (
                <a
                  href={ev.recording_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '9px 18px', fontSize: '13px', fontWeight: 700,
                    background: 'rgba(201,168,76,0.12)', border: '1px solid #c9a84c',
                    color: '#c9a84c', borderRadius: '8px', textDecoration: 'none',
                  }}
                >
                  📹 Watch Recording
                </a>
              )}
              {isPast && !ev.recording_url && (
                <span style={{ fontSize: '13px', color: '#555', fontStyle: 'italic' }}>Recording coming soon</span>
              )}

              {/* Locked */}
              {!accessible && (
                <a
                  href="/upgrade"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '9px 18px', fontSize: '13px', fontWeight: 700,
                    background: '#c9a84c', color: '#0a0a0a',
                    borderRadius: '8px', textDecoration: 'none',
                  }}
                >
                  🔒 Upgrade to Access
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '760px', padding: '32px 24px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>📅 Live Sessions</h1>
        <p style={{ color: '#888', fontSize: '14px', marginTop: '6px' }}>
          Join live Zoom calls, hot seats, and group sessions with the community.
        </p>
      </div>

      {events.length === 0 && (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <h3>No sessions scheduled yet</h3>
          <p style={{ color: '#888', fontSize: '14px' }}>Check back soon — live sessions will appear here.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Upcoming
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Past Sessions & Recordings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
}
