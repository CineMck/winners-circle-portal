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

const MAX_FILE_SIZE_MB = 50;

export default function PostComposer({ currentUser, channelId, challengeId, placeholder, onPostCreated }: Props) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const tierColor = getTierColor(currentUser?.tier || 'free');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      setPostError(`File too large: ${oversized.map(f => f.name).join(', ')} (max ${MAX_FILE_SIZE_MB}MB)`);
      return;
    }
    setPostError(null);
    files.forEach(file => {
      setMediaFiles(prev => [...prev, file]);
      setMediaTypes(prev => [...prev, file.type]);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setMediaPreviews(prev => [...prev, url]);
      } else {
        // For video, store the blob URL but don't try to render a video element on mobile
        const url = URL.createObjectURL(file);
        setMediaPreviews(prev => [...prev, url]);
      }
    });
    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeMedia(index: number) {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    setMediaTypes(prev => prev.filter((_, i) => i !== index));
    setPostError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) return;
    setLoading(true);
    setPostError(null);
    setUploadProgress(null);

    if (!channelId && !challengeId) {
      setPostError('No channel selected. Please post from a channel page.');
      setLoading(false);
      return;
    }

    let mediaUrls: string[] = [];

    // Upload each media file via server-side API route (bypasses storage RLS)
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      setUploadProgress(`Uploading file ${i + 1} of ${mediaFiles.length}…`);

      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'posts');
        fd.append('userId', currentUser.id);

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();

        if (!res.ok || json.error) {
          setPostError(`Upload failed: ${json.error || res.statusText}`);
          setLoading(false);
          setUploadProgress(null);
          return;
        }
        mediaUrls.push(json.url);
      } catch (err) {
        console.error('Upload exception:', err);
        setPostError('Upload failed — please check your connection and try again.');
        setLoading(false);
        setUploadProgress(null);
        return;
      }
    }

    setUploadProgress(null);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        content: content.trim(),
        author_id: currentUser.id,
        channel_id: channelId || null,
        challenge_id: challengeId || null,
        media_urls: mediaUrls,
      })
      .select('*, author:profiles!author_id(*), channel:channels(*)')
      .single();

    setLoading(false);
    if (error) {
      console.error('Post error:', error);
      setPostError(error.message);
      return;
    }
    setContent('');
    setMediaFiles([]);
    setMediaPreviews([]);
    setMediaTypes([]);
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
          {mediaFiles.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {mediaFiles.map((file, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {file.type.startsWith('image/') ? (
                    <img
                      src={mediaPreviews[i]}
                      alt=""
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                    />
                  ) : (
                    // Video placeholder — reliable on iOS Safari
                    <div style={{
                      width: 80, height: 80, borderRadius: '8px', background: '#222',
                      border: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}>
                      <span style={{ fontSize: '24px' }}>🎥</span>
                      <span style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72px' }}>
                        {file.name.length > 10 ? file.name.slice(0, 10) + '…' : file.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      background: '#ef4444', border: 'none', borderRadius: '50%',
                      width: 20, height: 20, cursor: 'pointer', color: 'white', fontSize: '14px', lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {uploadProgress && (
            <div style={{ color: 'var(--gold)', fontSize: '12px', marginTop: '6px', padding: '6px 10px', background: 'rgba(201,168,76,0.1)', borderRadius: '6px' }}>
              ⏳ {uploadProgress}
            </div>
          )}

          {postError && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', padding: '6px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
              ⚠️ {postError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '6px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px',
              }}>
                📷 Photo/Video
              </button>
              {mediaFiles.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''} selected
                </span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || (!content.trim() && mediaFiles.length === 0)}
              className="btn-gold"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              {loading ? (uploadProgress ? '⏳' : 'Posting…') : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
