import React from 'react';
import Link from 'next/link';
import { GROUP_TOKENS } from '@/components/feed/MentionInput';

/**
 * Render post/comment text with @mentions highlighted.
 * - @username  → gold link to that member's profile
 * - @everyone / @tier → gold badge (not a link)
 */
export function renderMentions(text: string): React.ReactNode {
  if (!text) return text;
  const parts: React.ReactNode[] = [];
  const regex = /@([a-zA-Z0-9_]+)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const name = m[1];
    if (GROUP_TOKENS.includes(name)) {
      parts.push(
        <span key={key++} style={{ color: 'var(--gold)', fontWeight: 700 }}>@{name}</span>
      );
    } else {
      parts.push(
        <Link key={key++} href={`/profile/${name}`} style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>@{name}</Link>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
