'use client';
import { useState } from 'react';

interface TierCounts {
  all: number;
  paid: number;
  core: number;
  elite: number;
  founding: number;
}

const TIER_OPTIONS = [
  { value: 'all', label: 'All Members', desc: 'Everyone including free members', color: '#888' },
  { value: 'paid', label: 'All Paid Members', desc: 'Core, Elite & Founding', color: '#c9a84c' },
  { value: 'core', label: 'Core Members', desc: 'Core tier only', color: '#c9a84c' },
  { value: 'elite', label: 'Elite Members', desc: 'Elite tier only', color: '#e0c068' },
  { value: 'founding', label: 'Founding Members', desc: 'Founding tier only', color: '#ffd700' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161616', border: '1px solid #2a2a2a',
  borderRadius: '10px', padding: '12px 14px', color: '#fff',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: '#888',
  marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
};

export default function EmailComposer({ tierCounts }: { tierCounts: TierCounts }) {
  const [tier, setTier] = useState<string>('paid');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; sent?: number; error?: string } | null>(null);

  const selectedCount = tierCounts[tier as keyof TierCounts] ?? 0;

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setResult({ error: 'Subject and body are required.' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subject, htmlBody: body, tier }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error || 'Send failed' });
      else setResult({ success: true, sent: data.sent });
    } catch (e) {
      setResult({ error: String(e) });
    }
    setSending(false);
  }

  return (
    <div style={{ padding: '32px', maxWidth: '880px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>✉️ Email Marketing</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
        Send announcements and updates to your members via email.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* LEFT: Compose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Recipients */}
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <label style={labelStyle}>Recipients</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {TIER_OPTIONS.map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                  background: tier === opt.value ? 'rgba(201,168,76,0.08)' : 'transparent',
                  border: `1px solid ${tier === opt.value ? 'rgba(201,168,76,0.4)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="radio"
                    name="tier"
                    value={opt.value}
                    checked={tier === opt.value}
                    onChange={() => setTier(opt.value)}
                    style={{ accentColor: '#c9a84c' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: tier === opt.value ? opt.color : 'var(--text)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{opt.desc}</div>
                  </div>
                  <div style={{
                    fontSize: '12px', fontWeight: 700,
                    color: tier === opt.value ? opt.color : 'var(--muted)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2px 8px', borderRadius: '20px',
                  }}>
                    {tierCounts[opt.value as keyof TierCounts]}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <label style={labelStyle}>Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. 🏆 This Week in The Winner's Circle"
              style={inputStyle}
            />
          </div>

          {/* Body */}
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <label style={labelStyle}>Message Body</label>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
              Write in plain text — line breaks are preserved. HTML is also supported for advanced formatting.
            </p>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={"Hey Winners,\n\nJust wanted to share a quick update...\n\n— John"}
              rows={12}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
            />
          </div>

          {/* Result */}
          {result && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px',
              background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              fontSize: '14px', color: result.success ? '#22c55e' : '#ef4444',
            }}>
              {result.success
                ? `✅ Email sent successfully to ${result.sent} member${result.sent !== 1 ? 's' : ''}!`
                : `⚠️ ${result.error}`}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setPreview(p => !p)}
              style={{
                flex: '0 0 auto', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: '10px',
                color: 'var(--text)', padding: '12px 20px', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              {preview ? 'Hide Preview' : '👁 Preview'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              style={{
                flex: 1,
                background: sending || !subject.trim() || !body.trim() ? '#5a4a20' : '#c9a84c',
                color: '#0a0a0a', border: 'none', borderRadius: '10px',
                padding: '12px', fontSize: '14px', fontWeight: 800,
                cursor: sending || !subject.trim() || !body.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? `Sending to ${selectedCount} members…` : `✉️ Send to ${selectedCount} Member${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div>
          <div style={{
            position: 'sticky', top: '80px',
            background: 'var(--black-card)', border: '1px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>EMAIL PREVIEW</div>
              {preview && <div style={{ fontSize: '11px', color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '20px' }}>Live</div>}
            </div>

            {!preview ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>✉️</div>
                <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Click "Preview" to see how your email will look</p>
              </div>
            ) : (
              <div style={{ padding: '16px', background: '#0a0a0a' }}>
                {/* Email mock */}
                <div style={{
                  background: '#111', border: '1px solid #1e1e1e',
                  borderTop: '4px solid #c9a84c', borderRadius: '12px',
                  overflow: 'hidden', fontSize: '13px',
                }}>
                  {/* Mock header */}
                  <div style={{ padding: '20px 24px', textAlign: 'center', borderBottom: '1px solid #1e1e1e' }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>🏆</div>
                    <div style={{ fontWeight: 800, color: '#c9a84c', fontSize: '15px' }}>The Winner&apos;s Circle</div>
                    <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Private Mastermind Community</div>
                  </div>

                  {/* Subject + body */}
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.3 }}>
                      {subject || <span style={{ color: '#444' }}>Your subject line will appear here</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {body || <span style={{ color: '#444' }}>Your message will appear here…</span>}
                    </div>
                  </div>

                  {/* CTA */}
                  <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block', background: '#c9a84c', color: '#0a0a0a',
                      fontWeight: 800, fontSize: '13px', padding: '10px 24px',
                      borderRadius: '8px',
                    }}>
                      Open The Winner&apos;s Circle →
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ background: '#0d0d0d', borderTop: '1px solid #1a1a1a', padding: '14px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#555' }}>
                      You&apos;re receiving this as a member of The Winner&apos;s Circle.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
