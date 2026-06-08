'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Post, Profile } from '@/types';
import { formatDate, getTierColor, getTierLabel, getInitials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { isMuxUrl, muxPlaybackId } from '@/lib/muxPlayback';
import { renderMentions } from '@/lib/renderMentions';
import Link from 'next/link';
import CommentSection from './CommentSection';

// Mux Player is a heavy web component — load it only when a Mux video renders.
const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

/**
 * Feed video player for Mux posts.
 *
 * With preload="none" the player can't know the video's dimensions until play,
 * so on its own it defaults to a 16:9 box and pillarboxes portrait clips. We
 * always have a correctly-proportioned poster, so we use the poster image as an
 * invisible sizer: it establishes the right aspect ratio (capped at 100% width /
 * 80vh height) and the player is absolutely positioned to fill that exact box.
 */
function FeedMuxVideo({ playbackId, poster }: { playbackId?: string; poster?: string }) {
  if (!playbackId) return null;
  // Fall back to Mux's auto-generated thumbnail if we have no stored poster.
  const posterSrc = poster || `https://image.mux.com/${playbackId}/thumbnail.jpg`;
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', maxWidth: '100%', lineHeight: 0 }}>
        <img
          src={posterSrc}
          alt=""
          aria-hidden
          style={{ display: 'block', maxWidth: '100%', maxHeight: '80vh', width: 'auto', height: 'auto', borderRadius: '8px' }}
        />
        <MuxPlayer
          playbackId={playbackId}
          poster={posterSrc}
          preload="none"
          streamType="on-demand"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden', background: '#000' }}
        />
      </div>
    </div>
  );
}

interface Props {
  post: Post;
  currentUser: Profile;
  onPin?: (postId: string, pinned: boolean) => void;
  onRemove?: (postId: string) => void;
}

const REACTIONS = ['👏', '🔥', '💪', '🏆', '❤️'];

export default function PostCard({ post, currentUser, onPin, onRemove }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(post.user_reaction || null);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showModerationMenu, setShowModerationMenu] = useState(false);
  const supabase = createClient();

  const author = post.author;
  const isMod = ['admin', 'moderator'].includes(currentUser?.role);
  const isAuthor = currentUser?.id === post.author_id;
  const tierColor = getTierColor(author?.tier || 'free');
  const initials = getInitials(author?.full_name || author?.email || 'U');

  async function handleReaction(emoji: string) {
    setShowReactionPicker(false);
    if (userReaction === emoji) {
      // Remove reaction
      await supabase.from('post_reactions').delete().match({ post_id: post.id, user_id: currentUser.id });
      setUserReaction(null);
      setReactionCount(c => c - 1);
    } else {
      if (userReaction) {
        await supabase.from('post_reactions').update({ emoji }).match({ post_id: post.id, user_id: currentUser.id });
      } else {
        await supabase.from('post_reactions').insert({ post_id: post.id, user_id: currentUser.id, emoji });
        setReactionCount(c => c + 1);
      }
      setUserReaction(emoji);
    }
  }

  async function handlePin() {
    const newPinned = !post.is_pinned;
    await supabase.from('posts').update({ is_pinned: newPinned }).eq('id', post.id);
    onPin?.(post.id, newPinned);
    setShowModerationMenu(false);
  }

  async function handleRemove() {
    const reason = prompt('Reason for removal (optional):') ?? 'Removed by moderator';
    const res = await fetch('/api/admin/remove-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert('Could not remove post: ' + (data.error ?? res.statusText));
      return;
    }
    onRemove?.(post.id);
    setShowModerationMenu(false);
  }

  return (
    <div className="card" style={{
      padding: '16px', marginBottom: '12px',
      border: post.is_pinned ? '1px solid var(--gold)' : '1px solid var(--border)',
      position: 'relative',
    }}>
      {post.is_pinned && (
        <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          📌 PINNED
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <Link href={`/profile/${author?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--gold-dim)', border: `2px solid ${tierColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: tierColor, flexShrink: 0, overflow: 'hidden',
          }}>
            {author?.avatar_url ? <img src={author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>{author?.full_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: tierColor, fontWeight: 600 }}>
                {getTierLabel(author?.tier || 'free')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{formatDate(post.created_at)}</span>
              {post.channel && (
                <Link href={`/community/${post.channel.slug}`} style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  #{post.channel.name.toLowerCase()}
                </Link>
              )}
            </div>
          </div>
        </Link>

        {(isMod || isAuthor) && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowModerationMenu(!showModerationMenu)} style={{
              background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px 8px', fontSize: '16px',
            }}>•••</button>
            {showModerationMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', background: 'var(--black-card)',
                border: '1px solid var(--border)', borderRadius: '8px', width: '160px', zIndex: 10, overflow: 'hidden',
              }}>
                {isMod && (
                  <button onClick={handlePin} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}>
                    {post.is_pinned ? '📌 Unpin' : '📌 Pin Post'}
                  </button>
                )}
                {(isMod || isAuthor) && (
                  <button onClick={handleRemove} style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textAlign: 'left', fontSize: '13px' }}>
                    🗑️ Remove Post
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
        {renderMentions(post.content)}
      </p>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: post.media_urls.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          gap: '8px', marginBottom: '12px',
        }}>
          {post.media_urls.map((url, i) => (
            isMuxUrl(url) ? (
              // Mux feed videos: adaptive HLS via Mux Player, sized to the poster's
              // aspect ratio so portrait clips aren't pillarboxed in a 16:9 box.
              <FeedMuxVideo
                key={i}
                playbackId={muxPlaybackId(url) || undefined}
                poster={post.media_thumbnails?.[i] || undefined}
              />
            ) : url.match(/\.(mp4|webm|mov)/i) ? (
              // Legacy Supabase videos (pre-Mux). preload="none" + poster keeps the feed light.
              <video
                key={i} src={url} controls preload="none"
                poster={post.media_thumbnails?.[i] || undefined}
                style={{ width: '100%', maxHeight: '80vh', borderRadius: '8px', display: 'block', background: '#000' }}
              />
            ) : (
              <img key={i} src={url} alt="" style={{ width: '100%', borderRadius: '8px', maxHeight: '480px', objectFit: 'cover', display: 'block' }} />
            )
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
        {/* Reaction */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => setShowReactionPicker(!showReactionPicker)} style={{
            background: userReaction ? 'var(--gold-dim)' : 'none', border: userReaction ? '1px solid var(--gold)' : '1px solid transparent',
            borderRadius: '20px', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '13px', color: userReaction ? 'var(--gold)' : 'var(--muted)',
          }}>
            <span>{userReaction || '👏'}</span>
            {reactionCount > 0 && <span>{reactionCount}</span>}
          </button>
          {showReactionPicker && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, background: 'var(--black-card)',
              border: '1px solid var(--border)', borderRadius: '24px', padding: '8px 12px',
              display: 'flex', gap: '8px', zIndex: 10,
            }}>
              {REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => handleReaction(emoji)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px',
                  transform: userReaction === emoji ? 'scale(1.3)' : 'scale(1)',
                  transition: 'transform 0.1s',
                }}>{emoji}</button>
              ))}
            </div>
          )}
        </div>

        {/* Comment toggle */}
        <button onClick={() => setShowComments(!showComments)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--muted)',
        }}>
          💬 {post.comment_count > 0 && post.comment_count} {showComments ? 'Hide' : 'Comment'}
        </button>
      </div>

      {showComments && <CommentSection postId={post.id} currentUser={currentUser} />}
    </div>
  );
}
