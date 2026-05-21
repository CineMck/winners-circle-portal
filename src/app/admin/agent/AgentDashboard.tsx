'use client';
import { useState, useRef, useEffect } from 'react';
import { getTierColor, getInitials } from '@/types';

interface OutreachItem {
  userId: string;
  name: string;
  type: 'props' | 'encourage';
  reason: string;
  message: string;
  approved: boolean | null;
  sent: boolean;
}

interface CommandEntry {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

interface Report {
  id: string;
  generated_at: string;
  summary_text: string;
  suggested_outreach: OutreachItem[];
  command_log: CommandEntry[];
  status: string;
  sent_at: string | null;
  metadata: { memberCount?: number; date?: string };
}

interface Member {
  id: string;
  full_name: string;
  avatar_url?: string;
  tier: string;
  username: string;
}

interface Props {
  initialReports: Report[];
  members: Member[];
  cronSecret: string;
}

function Avatar({ member, size = 36 }: { member?: Member; size?: number }) {
  const tc = getTierColor((member?.tier || 'free') as 'free' | 'core' | 'elite' | 'founding');
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--gold-dim)', border: `2px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 700, color: tc, overflow: 'hidden', flexShrink: 0 }}>
      {member?.avatar_url
        ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(member?.full_name || '?')}
    </div>
  );
}

export default function AgentDashboard({ initialReports, members, cronSecret }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(initialReports[0]?.id || null);
  const [generating, setGenerating] = useState(false);
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [outreachResult, setOutreachResult] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [commandLoading, setCommandLoading] = useState(false);
  const [localCommandLog, setLocalCommandLog] = useState<CommandEntry[]>([]);
  const [localOutreach, setLocalOutreach] = useState<OutreachItem[]>([]);
  const commandEndRef = useRef<HTMLDivElement>(null);

  const selectedReport = reports.find(r => r.id === selectedReportId) || null;

  // Sync local outreach when report changes
  useEffect(() => {
    if (selectedReport) {
      setLocalOutreach(selectedReport.suggested_outreach.map(item => ({ ...item })));
      setLocalCommandLog(selectedReport.command_log || []);
    }
    setOutreachResult(null);
  }, [selectedReportId]);

  useEffect(() => {
    commandEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localCommandLog]);

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]));

  // Generate new report
  async function runDailyReport() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/agent/daily-report?secret=${encodeURIComponent(cronSecret)}`);
      const data = await res.json();
      if (data.reportId) {
        // Reload reports from server by refreshing
        window.location.reload();
      } else {
        alert('Report generation failed: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Failed to connect to report API');
    }
    setGenerating(false);
  }

  // Toggle approval on a single outreach item
  function toggleApproval(userId: string) {
    setLocalOutreach(prev => prev.map(item =>
      item.userId === userId ? { ...item, approved: item.approved === true ? null : true } : item
    ));
  }

  // Reject an item (remove from list)
  function rejectItem(userId: string) {
    setLocalOutreach(prev => prev.map(item =>
      item.userId === userId ? { ...item, approved: false } : item
    ));
  }

  // Edit a message inline
  function editMessage(userId: string, newMsg: string) {
    setLocalOutreach(prev => prev.map(item =>
      item.userId === userId ? { ...item, message: newMsg } : item
    ));
  }

  // Send approved outreach
  async function sendOutreach() {
    const approved = localOutreach.filter(item => item.approved === true && !item.sent);
    if (approved.length === 0) {
      alert('No items approved. Click the checkmark on items you want to send.');
      return;
    }
    setSendingOutreach(true);
    setOutreachResult(null);
    try {
      const res = await fetch('/api/agent/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportId,
          items: approved.map(item => ({ userId: item.userId, message: item.message })),
        }),
      });
      const data = await res.json();
      if (data.sent !== undefined) {
        setOutreachResult(`✅ Sent ${data.sent} of ${data.total} messages as John.`);
        setLocalOutreach(prev => prev.map(item =>
          approved.find(a => a.userId === item.userId) ? { ...item, sent: true } : item
        ));
      } else {
        setOutreachResult('❌ Error: ' + (data.error || 'Unknown'));
      }
    } catch {
      setOutreachResult('❌ Network error');
    }
    setSendingOutreach(false);
  }

  // Send a command
  async function sendCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!commandInput.trim() || commandLoading) return;
    const instruction = commandInput.trim();
    setCommandInput('');
    setCommandLoading(true);

    const userEntry: CommandEntry = { role: 'user', content: instruction, timestamp: new Date().toISOString() };
    setLocalCommandLog(prev => [...prev, userEntry]);

    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReportId,
          instruction,
          commandLog: localCommandLog,
        }),
      });
      const data = await res.json();
      const agentEntry: CommandEntry = { role: 'agent', content: data.reply, timestamp: new Date().toISOString() };
      setLocalCommandLog(prev => [...prev, agentEntry]);

      // If agent suggested actions, add them to outreach list
      if (data.actions && data.actions.length > 0) {
        const newItems: OutreachItem[] = data.actions.map((a: { userId: string; name: string; message: string }) => ({
          userId: a.userId,
          name: a.name || memberMap[a.userId]?.full_name || 'Unknown',
          type: 'encourage' as const,
          reason: 'Added via agent command',
          message: a.message,
          approved: null,
          sent: false,
        }));
        setLocalOutreach(prev => [...prev, ...newItems.filter(n => !prev.find(p => p.userId === n.userId))]);
      }
    } catch {
      setLocalCommandLog(prev => [...prev, { role: 'agent', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date().toISOString() }]);
    }
    setCommandLoading(false);
  }

  const approvedCount = localOutreach.filter(i => i.approved === true && !i.sent).length;
  const sentCount = localOutreach.filter(i => i.sent).length;
  const pendingCount = localOutreach.filter(i => i.approved === null).length;

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px' }}>🤖 AI Agent</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            Daily member analysis powered by Claude — operates as John Wentworth.
          </p>
        </div>
        <button
          onClick={runDailyReport}
          disabled={generating}
          className="btn-gold"
          style={{ padding: '12px 24px', fontSize: '14px', opacity: generating ? 0.6 : 1 }}
        >
          {generating ? '⏳ Generating…' : '▶ Run Daily Report Now'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── Left: report list ── */}
        <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Past Reports
          </div>
          {reports.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
              No reports yet.<br />Click Run to generate the first one.
            </div>
          ) : reports.map(r => {
            const isSelected = r.id === selectedReportId;
            const d = new Date(r.generated_at);
            const statusColor = r.status === 'sent' ? '#10b981' : r.status === 'pending' ? 'var(--gold)' : 'var(--muted)';
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReportId(r.id)}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: isSelected ? 'rgba(212,175,55,0.08)' : 'transparent', borderLeft: `3px solid ${isSelected ? 'var(--gold)' : 'transparent'}` }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#161616'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
                  {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                  {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '11px', color: statusColor, fontWeight: 600, textTransform: 'capitalize' }}>
                  {r.status} · {r.suggested_outreach.length} suggestions
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right: selected report ── */}
        {!selectedReport ? (
          <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
            Select a report from the left, or generate a new one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Summary */}
            <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                📊 Report Summary — {new Date(selectedReport.generated_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: 'var(--text)' }}>{selectedReport.summary_text}</p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Pending', value: pendingCount, color: 'var(--gold)' },
                  { label: 'Approved', value: approvedCount, color: '#3b82f6' },
                  { label: 'Sent', value: sentCount, color: '#10b981' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', background: '#161616', borderRadius: '8px', padding: '10px 16px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outreach suggestions */}
            <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Outreach Queue</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Messages will be sent from John&apos;s account. Edit any message before approving.</div>
                </div>
                {approvedCount > 0 && (
                  <button
                    onClick={sendOutreach}
                    disabled={sendingOutreach}
                    className="btn-gold"
                    style={{ padding: '10px 20px', fontSize: '13px', flexShrink: 0, opacity: sendingOutreach ? 0.6 : 1 }}
                  >
                    {sendingOutreach ? 'Sending…' : `Send ${approvedCount} Message${approvedCount !== 1 ? 's' : ''} as John`}
                  </button>
                )}
              </div>

              {outreachResult && (
                <div style={{ padding: '12px 20px', background: outreachResult.startsWith('✅') ? '#0d1a0d' : '#1a0d0d', borderBottom: '1px solid var(--border)', fontSize: '13px', color: outreachResult.startsWith('✅') ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {outreachResult}
                </div>
              )}

              {localOutreach.filter(i => i.approved !== false).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  No outreach suggestions for this report.
                </div>
              ) : (
                <div>
                  {/* Props section */}
                  {localOutreach.filter(i => i.type === 'props' && i.approved !== false).length > 0 && (
                    <div style={{ padding: '12px 20px 4px', fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🎉 Give Props To
                    </div>
                  )}
                  {localOutreach.filter(i => i.type === 'props' && i.approved !== false).map(item => (
                    <OutreachCard key={item.userId} item={item} member={memberMap[item.userId]} onToggle={toggleApproval} onReject={rejectItem} onEditMessage={editMessage} />
                  ))}

                  {/* Encourage section */}
                  {localOutreach.filter(i => i.type === 'encourage' && i.approved !== false).length > 0 && (
                    <div style={{ padding: '12px 20px 4px', fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', borderTop: localOutreach.filter(i => i.type === 'props' && i.approved !== false).length > 0 ? '1px solid var(--border)' : 'none' }}>
                      💪 Check In With
                    </div>
                  )}
                  {localOutreach.filter(i => i.type === 'encourage' && i.approved !== false).map(item => (
                    <OutreachCard key={item.userId} item={item} member={memberMap[item.userId]} onToggle={toggleApproval} onReject={rejectItem} onEditMessage={editMessage} />
                  ))}
                </div>
              )}
            </div>

            {/* Command interface */}
            <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>💬 Give the Agent Instructions</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  Type commands like &quot;Send encouragement to all members with no check-ins this week&quot; or &quot;DM Sarah about her course progress&quot;
                </div>
              </div>

              {/* Command log */}
              <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {localCommandLog.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', padding: '16px 0' }}>
                    No commands yet. Type an instruction below.
                  </div>
                )}
                {localCommandLog.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: entry.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {entry.role === 'agent' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a2e', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🤖</div>
                    )}
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px', borderRadius: entry.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: entry.role === 'user' ? 'var(--gold)' : '#1e1e1e',
                      color: entry.role === 'user' ? '#0a0a0a' : 'var(--text)',
                      fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    }}>
                      {entry.content}
                    </div>
                    {entry.role === 'user' && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, color: 'var(--gold)', fontWeight: 700 }}>J</div>
                    )}
                  </div>
                ))}
                {commandLoading && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a2e', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                    <div style={{ background: '#1e1e1e', padding: '10px 14px', borderRadius: '18px 18px 18px 4px', color: 'var(--muted)', fontSize: '13px' }}>
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={commandEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendCommand} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <input
                  value={commandInput}
                  onChange={e => setCommandInput(e.target.value)}
                  placeholder='E.g. "Do outreach to all these members" or "Add a custom message for Mike"'
                  disabled={commandLoading}
                  style={{ flex: 1, background: '#161616', border: '1px solid var(--border)', borderRadius: '24px', padding: '10px 16px', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={commandLoading || !commandInput.trim()}
                  className="btn-gold"
                  style={{ padding: '10px 20px', borderRadius: '24px', fontSize: '13px', flexShrink: 0 }}
                >
                  Send
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Outreach card component ──
function OutreachCard({
  item, member, onToggle, onReject, onEditMessage,
}: {
  item: OutreachItem;
  member?: Member;
  onToggle: (id: string) => void;
  onReject: (id: string) => void;
  onEditMessage: (id: string, msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.message);

  function saveEdit() {
    onEditMessage(item.userId, draft);
    setEditing(false);
  }

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', opacity: item.sent ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Avatar member={member} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{item.name}</span>
            {item.sent && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>✅ Sent</span>}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', fontStyle: 'italic' }}>{item.reason}</div>

          {/* Message */}
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={3}
                style={{ width: '100%', background: '#161616', border: '1px solid var(--gold)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '13px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button onClick={saveEdit} style={{ fontSize: '12px', color: 'var(--gold)', background: 'none', border: '1px solid var(--gold)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setDraft(item.message); setEditing(false); }} style={{ fontSize: '12px', color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#161616', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, position: 'relative' }}>
              {item.message}
              {!item.sent && (
                <button
                  onClick={() => setEditing(true)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--muted)' }}
                  title="Edit message"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>

        {/* Approve / Reject buttons */}
        {!item.sent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => onToggle(item.userId)}
              title={item.approved ? 'Unapprove' : 'Approve to send'}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: `2px solid ${item.approved ? '#10b981' : 'var(--border)'}`,
                background: item.approved ? '#0d1a0d' : 'transparent',
                cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {item.approved ? '✓' : '○'}
            </button>
            <button
              onClick={() => onReject(item.userId)}
              title="Remove from queue"
              style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
