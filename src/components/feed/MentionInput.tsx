'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ResolvedMentions {
  userIds: string[];
  groups: string[]; // e.g. ['everyone', 'elite'] — only when allowGroups
}

// Group tags admins can use in posts. Order = dropdown order.
export const GROUP_TOKENS = ['everyone', 'free', 'core', 'elite', 'founding', 're_promo'];
const GROUP_LABEL: Record<string, string> = {
  everyone: 'All members',
  free: 'Free tier',
  core: 'Core tier',
  elite: 'Elite tier',
  founding: 'Founding tier',
  re_promo: 'Real Estate Promo tier',
};

interface Candidate {
  type: 'user' | 'group';
  id?: string;
  username: string; // token inserted after @
  label: string;
  sub?: string;
}

interface Props {
  value: string;
  onChange: (value: string, mentions: ResolvedMentions) => void;
  allowGroups?: boolean;
  multiline?: boolean;
  dropUp?: boolean;
  rows?: number;
  placeholder?: string;
  inputStyle?: React.CSSProperties;
}

export default function MentionInput({
  value, onChange, allowGroups, multiline, dropUp, rows = 3, placeholder, inputStyle,
}: Props) {
  const supabase = createClient();
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  // usernames the user actually picked → their UUID (avoids matching typos)
  const userMap = useRef<Map<string, string>>(new Map());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  function resolve(text: string): ResolvedMentions {
    const tokens = text.match(/@([a-zA-Z0-9_]+)/g) || [];
    const userIds = new Set<string>();
    const groups = new Set<string>();
    for (const t of tokens) {
      const name = t.slice(1);
      if (allowGroups && GROUP_TOKENS.includes(name)) groups.add(name);
      else if (userMap.current.has(name)) userIds.add(userMap.current.get(name)!);
    }
    return { userIds: [...userIds], groups: [...groups] };
  }

  async function refreshCandidates(text: string, caret: number) {
    const before = text.slice(0, caret);
    const m = before.match(/@([a-zA-Z0-9_]*)$/);
    if (!m) { setOpen(false); return; }
    const q = m[1];

    const list: Candidate[] = [];
    if (allowGroups) {
      for (const g of GROUP_TOKENS) {
        if (g.startsWith(q.toLowerCase())) list.push({ type: 'group', username: g, label: '@' + g, sub: GROUP_LABEL[g] });
      }
    }
    if (q.length >= 1) {
      // q is restricted to [a-zA-Z0-9_] by the regex above, so it's safe to interpolate.
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.${q}*,full_name.ilike.*${q}*`)
        .limit(6);
      (data || []).forEach((p) =>
        list.push({ type: 'user', id: p.id, username: p.username, label: p.full_name || p.username, sub: '@' + p.username })
      );
    }
    setCandidates(list);
    setActiveIdx(0);
    setOpen(list.length > 0);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text, resolve(text));
    refreshCandidates(text, e.target.selectionStart ?? text.length);
  }

  function pick(c: Candidate) {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = before.match(/@([a-zA-Z0-9_]*)$/);
    if (!m) return;
    const start = caret - m[0].length;
    const insert = '@' + c.username + ' ';
    const newText = value.slice(0, start) + insert + value.slice(caret);
    if (c.type === 'user' && c.id) userMap.current.set(c.username, c.id);
    onChange(newText, resolve(newText));
    setOpen(false);
    requestAnimationFrame(() => {
      const np = start + insert.length;
      el.focus();
      el.setSelectionRange(np, np);
    });
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, candidates.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && candidates[activeIdx]) { e.preventDefault(); pick(candidates[activeIdx]); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  const dropdown = open && (
    <div style={{
      position: 'absolute', left: 0, right: 0, zIndex: 300,
      [dropUp ? 'bottom' : 'top']: '100%',
      [dropUp ? 'marginBottom' : 'marginTop']: 4,
      background: 'var(--black-card, #161616)', border: '1px solid var(--border)',
      borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    } as React.CSSProperties}>
      {candidates.map((c, i) => (
        <div
          key={c.username + i}
          onMouseDown={(e) => { e.preventDefault(); pick(c); }}
          style={{
            padding: '8px 12px', cursor: 'pointer',
            background: i === activeIdx ? 'var(--gold-dim)' : 'transparent',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: c.type === 'group' ? 'var(--gold)' : 'var(--text)' }}>{c.label}</span>
          {c.sub && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.sub}</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={value} onChange={handleInput} onKeyDown={handleKey}
          rows={rows} placeholder={placeholder} style={inputStyle}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          value={value} onChange={handleInput} onKeyDown={handleKey}
          placeholder={placeholder} style={inputStyle}
        />
      )}
      {dropdown}
    </div>
  );
}
