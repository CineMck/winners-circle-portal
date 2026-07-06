'use client';
import { useEffect, useState } from 'react';

type Broadcast = {
  id: string;
  message: string;
  audience: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};

const AUDIENCES = [
  { value: 'all', label: 'All Members (consented)' },
  { value: 'base', label: 'Base' },
  { value: 'core', label: 'Core' },
  { value: 'elite', label: 'Elevate' },
  { value: 'founding', label: '1-1 Elite' },
  { value: 're', label: 'RE Marketing List' },
];

const SEGMENT = 160;

export default function SmsAdmin() {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [configured, setConfigured] = useState(true);
  const [recent, setRecent] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/admin/sms');
      const data = await res.json();
      if (res.ok) {
        setCounts(data.counts || {});
        setConfigured(!!data.configured);
        setRecent(data.recent || []);
      }
    } catch { /* noop */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const recipientCount = counts[audience] ?? 0;
  const segments = Math.max(1, Math.ceil(message.length / SEGMENT));

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), audience }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResult({ ok: false, text: data.error || `Send failed (HTTP ${res.status})` });
      } else {
        setResult({
          ok: true,
          text: `Sent to ${data.sent} of ${data.recipients} recipient${data.recipients === 1 ? '' : 's'}${data.failed ? ` · ${data.failed} failed` : ''}.`,
        });
        setMessage('');
        load();
      }
    } catch {
      setResult({ ok: false, text: 'Network error — please try again.' });
    }
    setSending(false);
    setConfirming(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#161616', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '12px 14px', color: 'var(--text)',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '760px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>📱 SMS Marketing</h1>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
        One-way text blasts via Twilio. Only members who opted in to text updates (and haven&apos;t
        replied STOP) receive messages.
      </p>

      {!configured && !loading && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ Twilio isn&apos;t configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and
          TWILIO_MESSAGING_SERVICE_SID on Railway. US delivery also requires an approved
          A2P 10DLC registration in the Twilio console.
        </div>
      )}

      {/* Composer */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Audience
        </label>
        <select value={audience} onChange={e => { setAudience(e.target.value); setConfirming(false); }} style={{ ...inputStyle, cursor: 'pointer', marginBottom: '14px' }}>
          {AUDIENCES.map(a => (
            <option key={a.value} value={a.value}>
              {a.label}{loading ? '' : ` — ${counts[a.value] ?? 0} textable`}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          Message
        </label>
        <textarea
          value={message}
          onChange={e => { setMessage(e.target.value); setConfirming(false); }}
          placeholder={'Hey {{first_name}}, doors open tonight at 6:30pm ET for the live call. See you there! — John'}
          rows={4}
          maxLength={640}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
          <span>{'{{first_name}}'} personalizes each text</span>
          <span>{message.length}/640 · {segments} segment{segments === 1 ? '' : 's'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          {confirming ? (
            <>
              <span style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>
                Text {recipientCount} member{recipientCount === 1 ? '' : 's'}?
              </span>
              <button onClick={send} disabled={sending} className="btn-gold" style={{ padding: '10px 22px', fontSize: '13px' }}>
                {sending ? 'Sending…' : '✓ Confirm & Send'}
              </button>
              <button onClick={() => setConfirming(false)} disabled={sending} className="btn-outline" style={{ padding: '10px 18px', fontSize: '13px' }}>
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={!message.trim() || recipientCount === 0 || !configured || loading}
              className="btn-gold"
              style={{ padding: '10px 26px', fontSize: '13px', opacity: !message.trim() || recipientCount === 0 || !configured ? 0.5 : 1 }}
            >
              Send to {loading ? '…' : recipientCount} recipient{recipientCount === 1 ? '' : 's'} →
            </button>
          )}
        </div>

        {result && (
          <div style={{
            marginTop: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
            background: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${result.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: result.ok ? '#22c55e' : '#ef4444',
          }}>
            {result.ok ? '✓ ' : '⚠️ '}{result.text}
          </div>
        )}
      </div>

      {/* History */}
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Recent Broadcasts</h2>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No broadcasts sent yet.</p>
        ) : recent.map(b => (
          <div key={b.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '4px' }}>{b.message}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {AUDIENCES.find(a => a.value === b.audience)?.label || b.audience} ·{' '}
              {b.sent_count}/{b.recipient_count} delivered to Twilio
              {b.failed_count > 0 && <span style={{ color: '#ef4444' }}> · {b.failed_count} failed</span>} ·{' '}
              {new Date(b.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
