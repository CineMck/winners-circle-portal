'use client';
import { useState, useRef } from 'react';
import { Profile, ChallengeParticipation, Post, getTierColor, getTierLabel } from '@/types';
import { formatDate, getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { isNative, pickOrCapturePhoto } from '@/lib/native';
import { uploadToStorage } from '@/lib/upload';
import Link from 'next/link';

interface Props {
  profile: Profile;
  completedChallenges: (ChallengeParticipation & { challenge: { title: string; badge_icon?: string; xp_reward: number } })[];
  recentPosts: Post[];
}

export default function ProfilePage({ profile, completedChallenges, recentPosts }: Props) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'challenges' | 'settings'>('activity');
  const avatarRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Membership controls
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const isPaidTier = profile?.tier !== 'free';

  async function openCustomerPortal() {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'GET', redirect: 'manual' });
      // 'manual' so we can capture the Location header from the 303 redirect
      const location = res.headers.get('location');
      if (location) {
        window.location.href = location;
        return;
      }
      // Fall back to following the redirect directly
      window.location.href = '/api/stripe/portal';
    } catch {
      window.location.href = '/api/stripe/portal';
    }
  }

  async function confirmCancel() {
    setCancelLoading(true);
    setCancelMessage(null);
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelMessage({ ok: false, text: data.error || 'Cancel failed' });
      } else {
        setCancelMessage({ ok: true, text: data.message || 'Cancellation scheduled.' });
        setShowCancelConfirm(false);
      }
    } catch {
      setCancelMessage({ ok: false, text: 'Network error — please try again.' });
    }
    setCancelLoading(false);
  }

  const tierColor = getTierColor(profile?.tier || 'free');

  async function uploadAvatarBlob(blob: Blob, fileName: string) {
    if (!blob.type.startsWith('image/')) {
      setAvatarError('Please select an image file');
      return;
    }
    if (blob.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5MB');
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);

    try {
      // Direct Supabase Storage upload — works on web AND inside Capacitor WebView
      const { url } = await uploadToStorage({
        file: blob,
        fileName,
        folder: 'avatars',
        userId: profile.id,
      });
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      setAvatarUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed — please try again';
      setAvatarError(msg);
    }
    setAvatarUploading(false);
    // Reset file input
    if (avatarRef.current) avatarRef.current.value = '';
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadAvatarBlob(file, file.name);
  }

  /**
   * Triggered by clicking the avatar or camera badge.
   * On native: opens the iOS/Android action sheet (Take Photo / Choose Library).
   * On web: opens the regular file picker.
   */
  async function openAvatarPicker() {
    if (isNative()) {
      const photo = await pickOrCapturePhoto({ source: 'prompt', maxSize: 1024 });
      if (photo) await uploadAvatarBlob(photo.blob, photo.fileName);
    } else {
      avatarRef.current?.click();
    }
  }

  async function saveProfile() {
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName, bio }).eq('id', profile.id);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      {/* Profile header */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>

            {/* Avatar with upload on click */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={openAvatarPicker}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'var(--gold-dim)', border: `3px solid ${tierColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', fontWeight: 700, color: tierColor,
                  cursor: 'pointer', overflow: 'hidden', position: 'relative',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  <span>{getInitials(profile?.full_name || 'U')}</span>
                )}
                {/* Hover overlay */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: avatarUploading ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}>
                  <span style={{ fontSize: '20px' }}>{avatarUploading ? '⏳' : '📷'}</span>
                </div>
              </div>
              {/* Camera badge */}
              <div
                onClick={openAvatarPicker}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--gold)', border: '2px solid var(--black-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '12px',
                }}
              >📷</div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              {editing ? (
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  style={{ background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text)', fontSize: '18px', fontWeight: 700, width: '200px' }} />
              ) : (
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>{profile?.full_name}</h1>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span className="tier-label" style={{ fontSize: '13px', color: tierColor, fontWeight: 700, border: `1px solid ${tierColor}`, padding: '2px 8px', borderRadius: '20px' }}>
                  {getTierLabel(profile?.tier || 'free')}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>@{profile?.username}</span>
              </div>
              {editing ? (
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a bio…" rows={2}
                  style={{ marginTop: '8px', background: '#161616', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', color: 'var(--text)', fontSize: '13px', width: '100%', resize: 'none' }} />
              ) : (
                profile?.bio && <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '8px' }}>{profile.bio}</p>
              )}
              {avatarError && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>⚠️ {avatarError}</p>
              )}
              {!editing && (
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                  Tap the photo to update your profile picture
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
            {editing ? (
              <>
                <button onClick={saveProfile} disabled={saving} className="btn-gold" style={{ padding: '8px 20px', fontSize: '13px' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-outline" style={{ padding: '8px 20px', fontSize: '13px' }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-outline" style={{ padding: '8px 20px', fontSize: '13px' }}>Edit Profile</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'XP Points', value: profile?.xp_points || 0, icon: '⚡' },
            { label: 'Challenges', value: completedChallenges.length, icon: '✅' },
            { label: 'Followers', value: profile?.followers_count || 0, icon: '👥' },
            { label: 'Posts', value: recentPosts.length, icon: '💬' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>{stat.icon}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)' }}>{stat.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--black-card)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
        {(['activity', 'challenges', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: activeTab === tab ? 'var(--gold-dim)' : 'transparent',
            color: activeTab === tab ? 'var(--gold)' : 'var(--muted)',
            fontWeight: activeTab === tab ? 700 : 400, fontSize: '13px', textTransform: 'capitalize',
          }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'activity' && (
        <div>
          {recentPosts.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--muted)' }}>No posts yet. Start contributing to the community!</p>
            </div>
          ) : recentPosts.map(post => (
            <div key={post.id} className="card" style={{ padding: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                {post.channel ? `#${post.channel.name.toLowerCase()}` : '🎯 Challenge post'} · {formatDate(post.created_at)}
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.5 }}>{post.content.slice(0, 200)}{post.content.length > 200 ? '…' : ''}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'challenges' && (
        <div>
          {completedChallenges.length === 0 ? (
            <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--muted)' }}>No completed challenges yet.</p>
              <Link href="/challenges" className="btn-gold" style={{ padding: '10px 24px', display: 'inline-block', marginTop: '12px' }}>Browse Challenges</Link>
            </div>
          ) : completedChallenges.map(p => (
            <div key={p.id} className="card" style={{ padding: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>{p.challenge?.badge_icon || '🏅'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.challenge?.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Completed {p.completed_at ? formatDate(p.completed_at) : ''}
                </div>
              </div>
              <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '14px' }}>+{p.challenge?.xp_reward} XP</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Membership</h3>

          {/* Current plan summary */}
          <div style={{ padding: '16px', background: '#161616', borderRadius: '10px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{getTierLabel(profile?.tier || 'free')} Plan</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: 2 }}>
                  Status: {profile?.subscription_status || (isPaidTier ? 'active' : 'free')}
                </div>
              </div>
              <Link href="/upgrade" className="btn-gold" style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                {isPaidTier ? 'Upgrade Plan' : 'Get a Plan'}
              </Link>
            </div>
          </div>

          {/* Membership controls — only for paid members */}
          {isPaidTier && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Modify membership */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#0f0f0f', border: '1px solid var(--border)', borderRadius: 10, gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Modify Membership</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Change plan, switch billing cycle, or update your card.</div>
                </div>
                <button
                  onClick={openCustomerPortal}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                >
                  Modify
                </button>
              </div>

              {/* Cancel membership */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#0f0f0f', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Cancel Membership</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Cancellation takes effect at the end of your current billing period — you keep full access until then.
                  </div>
                </div>
                {showCancelConfirm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#ef4444', whiteSpace: 'nowrap' }}>Sure?</span>
                    <button
                      onClick={confirmCancel}
                      disabled={cancelLoading}
                      style={{ background: '#ef4444', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 700 }}
                    >
                      {cancelLoading ? '…' : 'Yes, Cancel'}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--muted)' }}
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {cancelMessage && (
                <div style={{
                  marginTop: 4, padding: '10px 14px', borderRadius: 8, fontSize: 12,
                  background: cancelMessage.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${cancelMessage.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: cancelMessage.ok ? '#22c55e' : '#ef4444',
                }}>
                  {cancelMessage.ok ? '✓ ' : '⚠️ '}{cancelMessage.text}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
