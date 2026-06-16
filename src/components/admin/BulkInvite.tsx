'use client';

import { useState } from 'react';

type Row = { email: string; name: string; tier: string };
type Result = { email: string; status: 'sent' | 'manual' | 'error'; detail?: string };

const TIER_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'core', label: 'Core Member' },
  { value: 'elite', label: 'Elevate' },
  { value: 'founding', label: '1-1 Elite' },
];

// Map common spreadsheet tier labels onto the portal's tier keys.
function normalizeTier(v: string): string {
  const t = (v || '').trim().toLowerCase();
  if (!t) return '';
  if (t === 'free') return 'free';
  if (t === 'core' || t === 'core member') return 'core';
  if (t === 'elite' || t === 'elevate') return 'elite';
  if (['founding', 'founding member', '1-1 elite', '1-1 elite member'].includes(t)) return 'founding';
  return ['free', 'core', 'elite', 'founding'].includes(t) ? t : '';
}

// Minimal CSV parser that handles quoted fields and embedded commas/quotes.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

export default function BulkInvite() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [fallbackTier, setFallbackTier] = useState('core');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  function reset() {
    setRows([]); setFileName(''); setParseError(''); setResults([]); setDone(0); setMessage('');
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(''); setResults([]); setDone(0); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const grid = parseCSV(String(reader.result || ''));
      if (grid.length < 2) { setRows([]); setParseError('No data rows found in that file.'); return; }
      const header = grid[0].map(h => h.trim().toLowerCase());
      const emailIdx = header.findIndex(h => h === 'email' || h.includes('email'));
      const nameIdx = header.findIndex(h => h === 'name' || h === 'full name' || h === 'full_name');
      const tierIdx = header.findIndex(h => h === 'tier');
      if (emailIdx === -1) { setRows([]); setParseError('Could not find an "email" column in the header row.'); return; }
      const seen = new Set<string>();
      const parsed: Row[] = [];
      for (let r = 1; r < grid.length; r++) {
        const email = (grid[r][emailIdx] || '').trim().toLowerCase();
        if (!email || !email.includes('@') || seen.has(email)) continue;
        seen.add(email);
        parsed.push({
          email,
          name: nameIdx > -1 ? (grid[r][nameIdx] || '').trim() : '',
          tier: tierIdx > -1 ? normalizeTier(grid[r][tierIdx] || '') : '',
        });
      }
      setRows(parsed);
      if (!parsed.length) setParseError('No valid email addresses found.');
    };
    reader.readAsText(file);
  }

  async function sendAll() {
    setSending(true); setResults([]); setDone(0);
    const out: Result[] = [];
    for (const row of rows) {
      try {
        const res = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: row.email,
            name: row.name,
            tier: row.tier || fallbackTier,
            message: message.trim(),
            inviterName: "The Winner's Circle Team",
          }),
        });
        const data = await res.json();
        if (data.success && !data.warning) out.push({ email: row.email, status: 'sent' });
        else if (data.success && data.manualLink) out.push({ email: row.email, status: 'manual', detail: data.manualLink });
        else out.push({ email: row.email, status: 'error', detail: data.error || data.warning || 'Failed' });
      } catch {
        out.push({ email: row.email, status: 'error', detail: 'Network error' });
      }
      setDone(d => d + 1);
      setResults([...out]);
    }
    setSending(false);
  }

  function downloadManualLinks() {
    const lines = results.filter(r => r.status === 'manual').map(r => `${r.email},${r.detail}`);
    const blob = new Blob([`email,invite_link\n${lines.join('\n')}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'winners_circle_invite_links.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const sentCount = results.filter(r => r.status === 'sent').length;
  const manualCount = results.filter(r => r.status === 'manual').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#161616', border: '1px solid #333',
    borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none',
  };

  return (
    <>
      <button className="btn-outline" style={{ padding: '10px 20px', fontSize: '13px' }}
        onClick={() => { setOpen(true); reset(); }}>
        ⬆ Bulk Invite
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}
          onClick={() => !sending && setOpen(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto', padding: '28px' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>Bulk Invite Members</h2>
            <p style={{ color: '#888', fontSize: '13px', margin: '0 0 20px', lineHeight: 1.6 }}>
              Upload a CSV with an <strong style={{ color: '#fff' }}>email</strong> column (plus optional
              {' '}<strong style={{ color: '#fff' }}>name</strong> and <strong style={{ color: '#fff' }}>tier</strong> columns).
              Each person gets an invite email with a link to set up their account.
            </p>

            {/* File picker */}
            <label style={{ display: 'block', border: '1px dashed #333', borderRadius: '10px', padding: '18px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px' }}>
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} disabled={sending} />
              <div style={{ color: '#c9a84c', fontWeight: 700, fontSize: '14px' }}>
                {fileName ? `📄 ${fileName}` : '⬆ Choose CSV file'}
              </div>
              {rows.length > 0 && (
                <div style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>{rows.length} valid recipients found</div>
              )}
            </label>

            {parseError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                {parseError}
              </div>
            )}

            {rows.length > 0 && !results.length && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>
                    Default tier (used when a row has no tier column)
                  </label>
                  <select style={inputStyle} value={fallbackTier} onChange={e => setFallbackTier(e.target.value)} disabled={sending}>
                    {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>
                    Optional message (shown in the invite email)
                  </label>
                  <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={message}
                    onChange={e => setMessage(e.target.value)} disabled={sending}
                    placeholder="Welcome to The Winners Circle…" />
                </div>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Note: people who already have an account will be flagged as errors and skipped — that&apos;s expected.
                </p>
              </>
            )}

            {/* Progress */}
            {sending || results.length > 0 ? (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ height: '8px', background: '#1e1e1e', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ height: '100%', width: `${rows.length ? Math.round((done / rows.length) * 100) : 0}%`, background: 'var(--gold)', transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {done} / {rows.length} processed
                  {results.length > 0 && ` · ✓ ${sentCount} sent${manualCount ? ` · 🔗 ${manualCount} links` : ''}${errorCount ? ` · ✗ ${errorCount} skipped/failed` : ''}`}
                </div>
              </div>
            ) : null}

            {/* Results list */}
            {results.length > 0 && !sending && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #1e1e1e', borderRadius: '8px', marginBottom: '16px' }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '7px 12px', borderBottom: '1px solid #161616', fontSize: '12px' }}>
                    <span style={{ color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
                    <span style={{ flexShrink: 0, color: r.status === 'sent' ? '#22c55e' : r.status === 'manual' ? '#c9a84c' : '#ef4444' }}>
                      {r.status === 'sent' ? '✓ sent' : r.status === 'manual' ? '🔗 link' : `✗ ${r.detail || 'failed'}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {manualCount > 0 && !sending && (
              <button className="btn-outline" style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '12px' }} onClick={downloadManualLinks}>
                ⬇ Download {manualCount} invite link{manualCount > 1 ? 's' : ''} (email not configured)
              </button>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline" style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                onClick={() => setOpen(false)} disabled={sending}>
                {results.length > 0 ? 'Close' : 'Cancel'}
              </button>
              {rows.length > 0 && results.length === 0 && (
                <button className="btn-gold" style={{ flex: 2, padding: '12px', fontSize: '14px' }} onClick={sendAll} disabled={sending}>
                  {sending ? `Sending… (${done}/${rows.length})` : `Send ${rows.length} invite${rows.length > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
