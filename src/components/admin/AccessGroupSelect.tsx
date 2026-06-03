'use client';

import { ACCESS_GROUP_OPTIONS, AccessGroup } from '@/types';

interface Props {
  value: AccessGroup;
  onChange: (v: AccessGroup) => void;
  label?: string;
  /** Render compact mode (just the select, no label/help text). */
  compact?: boolean;
}

/**
 * Standard "Who can access this?" dropdown used in admin forms for
 * channels, challenges, courses, events, and resources.
 */
export default function AccessGroupSelect({
  value,
  onChange,
  label = 'Who can access this?',
  compact = false,
}: Props) {
  const selected = ACCESS_GROUP_OPTIONS.find(o => o.value === value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {!compact && label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value as AccessGroup)}
        style={{
          background: '#161616',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 12px',
          color: 'var(--text)',
          fontSize: 14,
          outline: 'none',
        }}
      >
        {ACCESS_GROUP_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {!compact && selected && (
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selected.hint}</div>
      )}
    </div>
  );
}
