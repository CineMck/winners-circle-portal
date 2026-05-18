'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, getTierColor, getTierLabel } from '@/types';

interface Event {
  id: string; title: string; description?: string; zoom_link?: string;
  recording_url?: string; starts_at: string; duration_minutes: number;
  tier_required: string; rsvp_count?: { count: number }[];
}

interface Props { profile: Profile; events: Event[]; myRsvpIds: string[]; }

const TIER_ORDER: Record<string, number> = { free: 0, core: 1, elite: 2, founding: 3 };
function canAccess(userTier: string, required: string) {
  return (TIER_ORDER[userTier] ?? 0) >= (TIER_ORDER[required] ?? 0);
}

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
    const tierColor = getTierColor(ev.tier_required as 'free'|'core'|'elite'|'founding');
    const endsAt = new Date(d.getTime() + ev.duration_minutes * 60000);
    const isLive = now >= d && now <= endsAt;

    return (
      <div className="card" style={{ padding: '20px', opacity: !accessible ? 0.65 : 1 }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Date block */}
          <div style={{ background: '#161616', border: `1px solid ${isLive ? '#22c55e' : '#2a2a2a'}`, borderRadius: '10px', padding: '10px 14px', textAlign: 'center', flexShrink: 0, minWidth: '60px' }}>
            {isLive && <div style={{ fontSize: '9px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>LIVE</div>}
            <div style={{ fontSize: '22px', fontWeight: 800, color: isLive ? '#22c55e' : 'var(--gold)' }}>{d.getDate()}</div>
            <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{d.toLocaleString('en', { month: 'short' })}</div>
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{ev.title}</h3>
              {ev.tier_required !== 'free' && (
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${tierColor}`, color: tierColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {accessible ? '' : '🔒 '}{getTierLabel(ev.tier_required as 'free'|'core'|'elite'|'founding')}+
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
              {d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ev.duration_minutes} min
              {rsvpCount > 0 && ` · ${rsvpCount} attending`}
            </div>
            {ev.description && <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.6 }}>{ev.description}</p>}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* RSVP or Join */}
              {!isPast && accessible && (
                isLive && ev.zoom_link ? (
                  <a href={ev.zoom_link} target="_blank" rel="noreferrer" className="btn-gold" style={{ padding: '9px 20px', fontSize: '13px', display: 'inline-block', textDecoration: 'none' }}>
                    🔴 Join Live Now
                  </a>
                ) : ev.zoom_link && isRsvped ? (
                  <a href={ev.zoom_link} target="_blank" rel="noreferrer" style={{ padding: '9px 20px', fontSize: '13px', display: 'inline-block', textDecoration: 'none', background: '#1e1e1e', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--gold)' }}>
                    🔗 Join Link
                  </a>
                ) : null
              )}
              {!isPast && accessible && !isLive && (
                <button onClick={() => toggleRsvp(ev.id)} disabled={loading === ev.id}
                  style={{ padding: '9px 20px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', border: isRsvped ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--gold)', background: isRsvped ? 'rgba(239,68,68,0.1)' : 'var(--gold-dim)', color: isRsvped ? '#ef4444' : 'var(--gold)', fontWeight: 600 }}>
                  {loading === ev.id ? '…' : isRsvped ? '✓ RSVPed (cancel)' : '+ RSVP'}
                </button>
              )}
              {/* Recording */}
              {isPast && ev.recording_url && (
                <a href={ev.recording_url} target="_blank" rel="noreferrer" style={{ padding: '9px 20px', fontSize: '13px', display: 'inline-block', textDecoration: 'none', background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: '8px', color: 'var(--gold)', fontWeight: 600 }}>
                  📹 Watch Recording
                </a>
              )}
              {isPast && !ev.recording_url && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Recording coming soon</span>}
              {!accessible && (
                <a href="/upgrade" style={{ padding: '9px 20px', fontSize: '13px', display: 'inline-block', textDecoration: 'none', background: 'var(--gold)', borderRadius: '8px', color: '#0a0a0a', fontWeight: 700 }}>
                  Upgrade to Access
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
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>Join live Zoom calls, hot seats, and group sessions with the community.</p>
      </div>

      {events.length === 0 && (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <h3>No sessions scheduled yet</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Check back soon — live sessions will appear here.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Upcoming</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Past Sessions & Recordings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {past.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}
    </div>
  );
}
