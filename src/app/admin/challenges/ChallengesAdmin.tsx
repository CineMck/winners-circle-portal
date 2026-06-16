'use client';
import { useState } from 'react';
import { Challenge, MemberTier } from '@/types';
import { createClient } from '@/lib/supabase/client';

export default function ChallengesAdmin({ challenges: initial, adminId }: { challenges: Challenge[]; adminId: string }) {
  const [challenges, setChallenges] = useState<Challenge[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', tier_required: 'free' as MemberTier,
    xp_reward: 100, badge_name: '', badge_icon: '',
    is_evergreen: true, start_date: '', end_date: '',
    instructions_video_url: '',
    // Progress tracking
    duration_days: '' as string | number,
    daily_tasks: [] as string[],
    completion_threshold: 80,
  });
  const [newTask, setNewTask] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  function addDailyTask() {
    if (!newTask.trim()) return;
    setForm(f => ({ ...f, daily_tasks: [...f.daily_tasks, newTask.trim()] }));
    setNewTask('');
  }

  function removeDailyTask(index: number) {
    setForm(f => ({ ...f, daily_tasks: f.daily_tasks.filter((_, i) => i !== index) }));
  }

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data } = await supabase.from('challenges').insert({
      title: form.title,
      description: form.description,
      tier_required: form.tier_required,
      xp_reward: form.xp_reward,
      badge_name: form.badge_name || null,
      badge_icon: form.badge_icon || null,
      is_evergreen: form.is_evergreen,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      instructions_video_url: form.instructions_video_url || null,
      duration_days: form.duration_days ? Number(form.duration_days) : null,
      daily_tasks: form.daily_tasks,
      completion_threshold: form.completion_threshold,
      is_active: true,
      created_by: adminId,
    }).select('*').single();
    if (data) setChallenges(prev => [data as Challenge, ...prev]);
    setSaving(false);
    setShowForm(false);
    setForm({
      title: '', description: '', tier_required: 'free', xp_reward: 100,
      badge_name: '', badge_icon: '', is_evergreen: true, start_date: '', end_date: '',
      instructions_video_url: '', duration_days: '', daily_tasks: [],
      completion_threshold: 80,
    });
  }

  async function toggleActive(challenge: Challenge) {
    await supabase.from('challenges').update({ is_active: !challenge.is_active }).eq('id', challenge.id);
    setChallenges(prev => prev.map(c => c.id === challenge.id ? { ...c, is_active: !c.is_active } : c));
  }

  async function deleteChallenge(challengeId: string) {
    if (!confirm('Delete this challenge? This cannot be undone.')) return;
    await supabase.from('challenges').delete().eq('id', challengeId);
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
  }

  const inputStyle = { width: '100%', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none' };
  const labelStyle = { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px', display: 'block' as const };
  const sectionStyle = { gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' };
  const sectionLabelStyle = { fontSize: '12px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '12px' };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800 }}>🎯 Challenges ({challenges.length})</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>
          {showForm ? '× Cancel' : '+ New Challenge'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'var(--black-card)', border: '1px solid var(--gold)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: 'var(--gold)' }}>Create New Challenge</h2>
          <form onSubmit={createChallenge} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* ─── Basic Info ─── */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="30-Day Pushup Challenge" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description *</label>
              <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} required placeholder="Describe what members need to do…" />
            </div>
            <div>
              <label style={labelStyle}>Tier Required</label>
              <select style={inputStyle} value={form.tier_required} onChange={e => setForm({...form, tier_required: e.target.value as MemberTier})}>
                <option value="free">Free</option>
                <option value="core">Core+</option>
                <option value="elite">Elite+</option>
                <option value="founding">Founding Only</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>XP Reward</label>
              <input type="number" style={inputStyle} value={form.xp_reward} onChange={e => setForm({...form, xp_reward: Number(e.target.value)})} min={0} />
            </div>
            <div>
              <label style={labelStyle}>Badge Name</label>
              <input style={inputStyle} value={form.badge_name} onChange={e => setForm({...form, badge_name: e.target.value})} placeholder="Consistency King" />
            </div>
            <div>
              <label style={labelStyle}>Badge Icon (emoji)</label>
              <input style={inputStyle} value={form.badge_icon} onChange={e => setForm({...form, badge_icon: e.target.value})} placeholder="🏅" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Instructions Video URL (optional)</label>
              <input style={inputStyle} value={form.instructions_video_url} onChange={e => setForm({...form, instructions_video_url: e.target.value})} placeholder="https://…" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="evergreen" checked={form.is_evergreen} onChange={e => setForm({...form, is_evergreen: e.target.checked})} />
              <label htmlFor="evergreen" style={{ fontSize: '14px', cursor: 'pointer' }}>Evergreen (no fixed end date)</label>
            </div>
            {!form.is_evergreen && (
              <>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="datetime-local" style={inputStyle} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="datetime-local" style={inputStyle} value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </>
            )}

            {/* ─── Progress Tracking ─── */}
            <div style={sectionStyle}>
              <div style={sectionLabelStyle}>📊 Progress Tracking</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Duration (days) <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— leave blank for unlimited</span></label>
                  <input type="number" style={inputStyle} value={form.duration_days} onChange={e => setForm({...form, duration_days: e.target.value})} placeholder="e.g. 30" min={1} />
                </div>
                <div>
                  <label style={labelStyle}>Completion Threshold <span style={{ color: 'var(--muted)', fontWeight: 400 }}>% of days required</span></label>
                  <input type="number" style={inputStyle} value={form.completion_threshold} onChange={e => setForm({...form, completion_threshold: Number(e.target.value)})} min={1} max={100} />
                </div>
              </div>
            </div>

            {/* Daily Tasks */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Daily Checklist Tasks <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— members check these off each day</span></label>

              {form.daily_tasks.length > 0 && (
                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {form.daily_tasks.map((task, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
                      <span style={{ fontSize: '13px', flex: 1 }}>☐ {task}</span>
                      <button type="button" onClick={() => removeDailyTask(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDailyTask())}
                  placeholder="Add a daily task (e.g. 'Complete 50 pushups')"
                />
                <button type="button" onClick={addDailyTask} style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '10px 18px', color: 'var(--gold)', cursor: 'pointer', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                💡 Examples: &quot;Complete 50 pushups&quot;, &quot;Drink 8 glasses of water&quot;, &quot;Post a progress photo&quot;, &quot;Read 10 pages&quot;
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '12px 28px' }}>
                {saving ? 'Creating…' : 'Create Challenge'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Challenge list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {challenges.map(challenge => (
          <div key={challenge.id} style={{
            background: 'var(--black-card)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            opacity: challenge.is_active ? 1 : 0.5,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {challenge.badge_icon && <span style={{ fontSize: '20px' }}>{challenge.badge_icon}</span>}
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{challenge.title}</span>
                {!challenge.is_active && <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>INACTIVE</span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>{challenge.tier_required} · +{challenge.xp_reward} XP · {challenge.is_evergreen ? 'Evergreen' : 'Dated'}</span>
                {challenge.duration_days && <span>⏱ {challenge.duration_days} days</span>}
                {challenge.target_metric && <span>📊 Tracks: {challenge.target_metric}</span>}
                {challenge.daily_tasks?.length > 0 && <span>☑ {challenge.daily_tasks.length} daily tasks</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => toggleActive(challenge)}
                style={{ background: 'none', border: `1px solid ${challenge.is_active ? '#ef4444' : '#22c55e'}`, borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', color: challenge.is_active ? '#ef4444' : '#22c55e' }}>
                {challenge.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => deleteChallenge(challenge.id)}
                style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: '#ef4444' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
