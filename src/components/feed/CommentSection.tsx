'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Comment, Profile } from '@/types';
import { formatDate, getTierColor, getInitials } from '@/lib/utils';

interface Props {
  postId: string;
  currentUser: Profile;
}

export default function CommentSection({ postId, currentUser }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('comments')
      .select('*, author:profiles(*)')
      .eq('post_id', postId)
      .eq('is_removed', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments((data as Comment[]) || []));
  }, [postId]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: currentUser.id, content: newComment.trim() })
      .select('*, author:profiles(*)')
      .single();
    if (data) setComments(prev => [...prev, data as Comment]);
    setNewComment('');
    setLoading(false);
  }

  async function removeComment(commentId: string) {
    const isMod = ['admin', 'moderator'].includes(currentUser?.role);
    await supabase.from('comments').update({ is_removed: true, removed_by: currentUser.id }).eq('id', commentId);
    if (isMod) {
      await supabase.from('moderation_log').insert({
        moderator_id: currentUser.id, action: 'remove_comment',
        target_type: 'comment', target_id: commentId,
      });
    }
    setComments(prev => prev.filter(c => c.id !== commentId));
  }

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
      {comments.map(comment => {
        const author = comment.author;
        const tierColor = getTierColor(author?.tier || 'free');
        const canRemove = currentUser.id === comment.author_id || ['admin', 'moderator'].includes(currentUser.role);
        return (
          <div key={comment.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'var(--gold-dim)', border: `1px solid ${tierColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: tierColor,
            }}>{getInitials(author?.full_name || 'U')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{author?.full_name}</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{formatDate(comment.created_at)}</span>
                {canRemove && (
                  <button onClick={() => removeComment(comment.id)} style={{
                    marginLeft: 'auto', background: 'none', border: 'none',
                    color: 'var(--muted)', cursor: 'pointer', fontSize: '11px',
                  }}>Remove</button>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{comment.content}</p>
            </div>
          </div>
        );
      })}

      <form onSubmit={submitComment} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--gold-dim)', border: `1px solid ${getTierColor(currentUser?.tier || 'free')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color: getTierColor(currentUser?.tier || 'free'),
        }}>{getInitials(currentUser?.full_name || 'U')}</div>
        <input
          value={newComment} onChange={e => setNewComment(e.target.value)}
          placeholder="Write a comment…"
          style={{
            flex: 1, background: '#161616', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '7px 14px', color: 'var(--text)',
            fontSize: '13px', outline: 'none',
          }}
        />
        <button type="submit" disabled={loading || !newComment.trim()} style={{
          background: 'var(--gold)', color: '#0a0a0a', border: 'none',
          borderRadius: '20px', padding: '7px 16px', cursor: 'pointer',
          fontWeight: 700, fontSize: '13px', opacity: !newComment.trim() ? 0.5 : 1,
        }}>Post</button>
      </form>
    </div>
  );
}
