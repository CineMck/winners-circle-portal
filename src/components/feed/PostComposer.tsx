'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, getTierColor, getInitials } from '@/types';

interface Props {
  currentUser: Profile;
  channelId?: string;
  challengeId?: string;
  placeholder?: string;
  onPostCreated?: (post: unknown) => void;
}

export default function PostComposer({ currentUser, channelId, challengeId, placeholder, onPostCreated }: Props) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const tierColor = getTierColor(currentUser?.tier || 'free');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setMediaPreviews(prev => [...prev, url]);
    });
  }

  function removeMedia(index: number) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) return;
    setLoading(true);

    let mediaUrls: string[] = [];

    // Upload media files
    for (const file of mediaFiles) {
      const ext = file.name.split('.').pop();
      const path = `posts/${currentUser.id}/${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from('media').upload(path, file);
      if (data) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        mediaUrls.push(urlData.publicUrl);
      }
    }

    const { data } = await supabase
      .from('posts')
      .insert({
        content: content.trim(),
        author_id: currentUser.id,
        channel_id: channelId || null,
        challenge_id: challengeId || null,
        media_urls: mediaUrls,
      })
      .select('*, author:profiles(*), channel:channels(*)')
      .single();

    setContent('');
    setMediaFiles([]);
    setMediaPreviews([]);
    setLoading(false);
    if (data) onPostCreated?.(data);
  }

  return (
    <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'var(--gold-dim)', border: `2px solid ${tierColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: tierColor,
        }}>{getInitials(currentUser?.full_name || 'U')}</div>
        <form onSubmit={handleSubmit} style={{ flex: 1 }}>
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            placeholder={placeholder || "Share something with the community…"}
            rows={3}
            style={{
              width: '100%', background: '#161616', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '12px', color: 'var(--text)',
              fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit',
            }}
          />

          {/* Media previews */}
          {mediaPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {mediaPreviews.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {mediaFiles[i]?.type.startsWith('video') ? (
                    <video src={url} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px' }} />
                  )}
                  <button onClick={() => removeMedia(i)} style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    background: '#ef4444', border: 'none', borderRadius: '50%',
                    width: 20, height: 20, cursor: 'pointer', color: 'white', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '6px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px',
              }}>📷 Photo/Video</button>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
            <button type="submit" disabled={loading || (!content.trim() && mediaFiles.length === 0)} className="btn-gold"
              style={{ padding: '8px 20px', fontSize: '13px' }}>
              {loading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
