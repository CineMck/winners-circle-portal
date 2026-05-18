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
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function createChallenge(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data } = await supabase.from('challenges').insert({
      ...form, is_active: true, created_by: adminId,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      instructions_video_url: form.instructions_video_url || null,
    }).select('*').single();
    if (data) setChallenges(prev => [data as Challenge, ...prev]);
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', description: '', tier_required: 'free', xp_reward: 100, badge_name: '', badge_icon: '', is_evergreen: true, start_date: '', end_date: '', instructions_video_url: '' });
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
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="30-Day Consistency Challenge" />
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
              <input style={inputStyle} value={form.instructions_video_url} onChange={e => setForm({...form, instructions_video_url: e.target.value})} placeholder="https://..." />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="evergreen" checked={form.is_evergreen} onChange={e => setForm({...form, is_evergreen: e.target.checked})} />
              <label htmlFor="evergreen" style={{ fontSize: '14px', cursor: 'pointer' }}>Evergreen (no end date)</label>
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
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                {challenge.tier_required} · +{challenge.xp_reward} XP · {challenge.is_evergreen ? 'Evergreen' : 'Dated'}
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
