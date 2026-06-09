'use client';
import { useState } from 'react';

interface Step {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_minutes: number;
  channel: string;
  subject: string;
  body: string;
  is_active: boolean;
}
export interface SeqWithSteps {
  id: string;
  name: string;
  trigger: string;
  is_active: boolean;
  steps: Step[];
  counts: Record<string, number>;
}

const input: React.CSSProperties = {
  width: '100%', background: '#161616', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
};
const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 };

function humanDelay(min: number) {
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.round(min / 60)} hr`;
  return `${Math.round(min / 1440)} day${Math.round(min / 1440) === 1 ? '' : 's'}`;
}

export default function AutomationsAdmin({ initial }: { initial: SeqWithSteps[] }) {
  const [seqs, setSeqs] = useState<SeqWithSteps[]>(initial);
  const [saving, setSaving] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/automations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return res.ok ? res.json() : Promise.reject(await res.json().catch(() => ({})));
  }

  async function toggleSeq(seq: SeqWithSteps) {
    await post({ action: 'toggleSequence', id: seq.id, is_active: !seq.is_active });
    setSeqs(prev => prev.map(s => s.id === seq.id ? { ...s, is_active: !s.is_active } : s));
  }

  function patchStepLocal(seqId: string, stepId: string, patch: Partial<Step>) {
    setSeqs(prev => prev.map(s => s.id === seqId ? { ...s, steps: s.steps.map(st => st.id === stepId ? { ...st, ...patch } : st) } : s));
  }

  async function saveStep(step: Step) {
    setSaving(step.id);
    try {
      await post({ action: 'updateStep', id: step.id, step_order: step.step_order, delay_minutes: step.delay_minutes, channel: step.channel, subject: step.subject, body: step.body });
    } finally { setSaving(null); }
  }

  async function addStep(seq: SeqWithSteps) {
    const { step } = await post({ action: 'addStep', sequence_id: seq.id });
    setSeqs(prev => prev.map(s => s.id === seq.id ? { ...s, steps: [...s.steps, step] } : s));
  }

  async function deleteStep(seqId: string, stepId: string) {
    if (!confirm('Delete this step?')) return;
    await post({ action: 'deleteStep', id: stepId });
    setSeqs(prev => prev.map(s => s.id === seqId ? { ...s, steps: s.steps.filter(st => st.id !== stepId) } : s));
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '8px 0 40px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Automations</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
        Drip sequences that nurture leads into members. RE RSVPs are auto-enrolled; a lead exits the moment they become a paying member. Requires the automations cron to be scheduled.
      </p>

      {seqs.length === 0 && <p style={{ color: 'var(--muted)' }}>No sequences yet. Run <code>supabase/automations.sql</code> to seed the recommended one.</p>}

      {seqs.map(seq => (
        <div key={seq.id} className="card" style={{ padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{seq.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Trigger: {seq.trigger} · {seq.counts.active} active · {seq.counts.completed} completed · {seq.counts.exited} converted/exited
              </div>
            </div>
            <button onClick={() => toggleSeq(seq)} className={seq.is_active ? 'btn-gold' : ''} style={{
              padding: '7px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer',
              border: seq.is_active ? 'none' : '1px solid var(--border)',
              background: seq.is_active ? undefined : 'transparent', color: seq.is_active ? undefined : 'var(--muted)',
            }}>{seq.is_active ? '● Active' : 'Inactive — activate'}</button>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {seq.steps.map((step, i) => (
              <div key={step.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: '#111' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>Step {i + 1}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>after {humanDelay(step.delay_minutes)}</span>
                  <span style={{ marginLeft: 'auto' }} />
                  <button onClick={() => deleteStep(seq.id, step.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <div style={{ width: 120 }}>
                    <label style={lbl}>Channel</label>
                    <select style={input} value={step.channel} onChange={e => patchStepLocal(seq.id, step.id, { channel: e.target.value })}>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                  <div style={{ width: 150 }}>
                    <label style={lbl}>Delay (minutes)</label>
                    <input style={input} type="number" value={step.delay_minutes} onChange={e => patchStepLocal(seq.id, step.id, { delay_minutes: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                {step.channel === 'email' && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={lbl}>Subject</label>
                    <input style={input} value={step.subject} onChange={e => patchStepLocal(seq.id, step.id, { subject: e.target.value })} />
                  </div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <label style={lbl}>{step.channel === 'sms' ? 'SMS text' : 'Email body (HTML; use {{first_name}})'}</label>
                  <textarea style={{ ...input, minHeight: step.channel === 'sms' ? 60 : 110, resize: 'vertical' }}
                    value={step.body} onChange={e => patchStepLocal(seq.id, step.id, { body: e.target.value })} />
                </div>
                <button onClick={() => saveStep(step)} disabled={saving === step.id} className="btn-gold" style={{ padding: '6px 14px', fontSize: 12 }}>
                  {saving === step.id ? 'Saving…' : 'Save step'}
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => addStep(seq)} style={{ marginTop: 12, background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 14px', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
            + Add step
          </button>
        </div>
      ))}
    </div>
  );
}
