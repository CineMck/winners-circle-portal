'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, getTierColor, getInitials } from '@/types';
import { uploadToStorage } from '@/lib/upload';
import { generateVideoThumbnails, VideoThumb } from '@/lib/videoThumbnails';

interface Props {
  currentUser: Profile;
  channelId?: string;
  challengeId?: string;
  placeholder?: string;
  allowNoChannel?: boolean;
  onPostCreated?: (post: unknown) => void;
}

const MAX_FILE_SIZE_MB = 50;

interface MediaItem {
  file: File;
  isVideo: boolean;
  preview: string;            // object URL (images only)
  thumbs: VideoThumb[];       // candidate posters (videos only)
  selected: number;           // index into thumbs, or -1 if none chosen
  custom: VideoThumb | null;  // user-supplied poster image
  generating: boolean;        // true while frames are being captured
}

export default function PostComposer({ currentUser, channelId, challengeId, placeholder, allowNoChannel, onPostCreated }: Props) {
  const [content, setContent] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const customThumbRef = useRef<HTMLInputElement>(null);
  const customTargetRef = useRef<number | null>(null);
  const supabase = createClient();

  const tierColor = getTierColor(currentUser?.tier || 'free');

  function updateItem(index: number, patch: Partial<MediaItem>) {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      setPostError(`File too large: ${oversized.map(f => f.name).join(', ')} (max ${MAX_FILE_SIZE_MB}MB)`);
      return;
    }
    setPostError(null);

    files.forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const item: MediaItem = {
        file,
        isVideo,
        preview: isVideo ? '' : URL.createObjectURL(file),
        thumbs: [],
        selected: -1,
        custom: null,
        generating: isVideo,
      };
      setItems(prev => {
        const next = [...prev, item];
        const itemIndex = next.length - 1;
        // Kick off thumbnail generation for videos (async, non-blocking).
        if (isVideo) {
          generateVideoThumbnails(file, 3)
            .then(thumbs => {
              setItems(cur => cur.map((it, i) =>
                it.file === file ? { ...it, thumbs, selected: thumbs.length ? 0 : -1, generating: false } : it
              ));
            })
            .catch(() => {
              setItems(cur => cur.map(it => (it.file === file ? { ...it, generating: false } : it)));
            });
          void itemIndex;
        }
        return next;
      });
    });

    // Reset file input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }

  function openMediaPicker() {
    fileRef.current?.click();
  }

  function removeMedia(index: number) {
    setItems(prev => {
      const it = prev[index];
      if (it) {
        if (it.preview) URL.revokeObjectURL(it.preview);
        it.thumbs.forEach(t => URL.revokeObjectURL(t.url));
        if (it.custom) URL.revokeObjectURL(it.custom.url);
      }
      return prev.filter((_, i) => i !== index);
    });
    setPostError(null);
  }

  function openCustomThumbPicker(index: number) {
    customTargetRef.current = index;
    customThumbRef.current?.click();
  }

  function handleCustomThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = customTargetRef.current;
    if (file && target !== null) {
      if (!file.type.startsWith('image/')) {
        setPostError('Thumbnail must be an image.');
      } else {
        const url = URL.createObjectURL(file);
        setItems(prev => prev.map((it, i) => {
          if (i !== target) return it;
          if (it.custom) URL.revokeObjectURL(it.custom.url);
          return { ...it, custom: { url, blob: file }, selected: -1 };
        }));
      }
    }
    customTargetRef.current = null;
    if (customThumbRef.current) customThumbRef.current.value = '';
  }

  function chosenPoster(it: MediaItem): VideoThumb | null {
    if (it.custom) return it.custom;
    if (it.selected >= 0 && it.thumbs[it.selected]) return it.thumbs[it.selected];
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && items.length === 0) return;
    setLoading(true);
    setPostError(null);
    setUploadProgress(null);

    if (!channelId && !challengeId && !allowNoChannel) {
      setPostError('No channel selected. Please post from a channel page.');
      setLoading(false);
      return;
    }

    let mediaUrls: string[] = [];
    let mediaThumbnails: string[] = [];

    try {
      setUploadProgress(items.length > 1 ? `Uploading ${items.length} files…` : 'Uploading…');

      // Upload all media (and any chosen video posters) in parallel,
      // preserving order via the array index.
      const results = await Promise.all(items.map(async (item) => {
        const { url } = await uploadToStorage({
          file: item.file,
          fileName: item.file.name,
          folder: 'posts',
          userId: currentUser.id,
        });

        let thumbUrl = '';
        if (item.isVideo) {
          const poster = chosenPoster(item);
          if (poster) {
            const { url: posterUrl } = await uploadToStorage({
              file: poster.blob,
              fileName: `thumb-${item.file.name}.jpg`,
              folder: 'posts',
              userId: currentUser.id,
            });
            thumbUrl = posterUrl;
          }
        }
        return { url, thumbUrl };
      }));

      mediaUrls = results.map(r => r.url);
      mediaThumbnails = results.map(r => r.thumbUrl);
    } catch (err) {
      console.error('Upload exception:', err);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setPostError(`Upload failed: ${msg}`);
      setLoading(false);
      setUploadProgress(null);
      return;
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
        media_thumbnails: mediaThumbnails,
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
    setItems([]);
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
          {items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {items.map((item, i) => {
                const poster = chosenPoster(item);
                return (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {!item.isVideo ? (
                        <img
                          src={item.preview}
                          alt=""
                          style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                        />
                      ) : poster ? (
                        <div style={{ position: 'relative', width: 80, height: 80 }}>
                          <img
                            src={poster.url}
                            alt=""
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                          />
                          <span style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                          }}>▶</span>
                        </div>
                      ) : (
                        <div style={{
                          width: 80, height: 80, borderRadius: '8px', background: '#222',
                          border: '1px solid var(--border)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}>
                          <span style={{ fontSize: '24px' }}>🎥</span>
                          <span style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72px' }}>
                            {item.file.name.length > 10 ? item.file.name.slice(0, 10) + '…' : item.file.name}
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

                    {/* Thumbnail chooser (videos only) */}
                    {item.isVideo && (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                          {item.generating
                            ? 'Generating thumbnails…'
                            : (item.thumbs.length > 0 || item.custom)
                              ? 'Choose a thumbnail'
                              : 'Add a thumbnail (optional)'}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {item.thumbs.map((t, ti) => {
                            const isSel = !item.custom && item.selected === ti;
                            return (
                              <img
                                key={ti}
                                src={t.url}
                                alt=""
                                onClick={() => updateItem(i, { selected: ti, custom: null })}
                                style={{
                                  width: 52, height: 52, objectFit: 'cover', borderRadius: '6px', cursor: 'pointer',
                                  border: isSel ? '2px solid var(--gold)' : '2px solid transparent',
                                }}
                              />
                            );
                          })}
                          {item.custom && (
                            <img
                              src={item.custom.url}
                              alt=""
                              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: '6px', border: '2px solid var(--gold)' }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => openCustomThumbPicker(i)}
                            style={{
                              width: 52, height: 52, borderRadius: '6px', cursor: 'pointer',
                              background: 'none', border: '1px dashed var(--border)', color: 'var(--muted)',
                              fontSize: '10px', lineHeight: 1.1, padding: '2px',
                            }}
                          >📷 Upload</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
              <button type="button" onClick={openMediaPicker} style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '6px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px',
              }}>
                📷 Photo/Video
              </button>
              {items.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {items.length} file{items.length > 1 ? 's' : ''} selected
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
              <input
                ref={customThumbRef}
                type="file"
                accept="image/*"
                onChange={handleCustomThumb}
                style={{ display: 'none' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || (!content.trim() && items.length === 0)}
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
