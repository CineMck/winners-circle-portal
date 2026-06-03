'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * iOS/Android-style pull-to-refresh.
 *
 * Wrap a page's content with this. On touch devices the user can
 * drag down from the top of the page to trigger `onRefresh`.
 *
 * Behaviour:
 *   - Only activates when the page is scrolled to the top.
 *   - Shows "Pull down to refresh" text while dragging.
 *   - Text changes to "Release to refresh" once past the threshold.
 *   - Shows a spinner while the refresh promise is pending.
 *   - No-op on non-touch (desktop) devices — wrapper is transparent.
 */

const THRESHOLD = 70;         // px the user must pull before release triggers refresh
const MAX_PULL = 110;         // px we clamp the indicator at
const RESISTANCE = 0.5;       // dampen the visual pull (feels like rubber band)

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Override the resting text. */
  pullLabel?: string;
  /** Override the "release to refresh" text. */
  releaseLabel?: string;
  /** Override the busy text. */
  refreshingLabel?: string;
}

export default function PullToRefresh({
  onRefresh,
  children,
  pullLabel = 'Pull down to refresh',
  releaseLabel = 'Release to refresh',
  refreshingLabel = 'Refreshing…',
}: Props) {
  const [pull, setPull] = useState(0);        // current pull distance in px
  const [busy, setBusy] = useState(false);
  const startYRef = useRef<number | null>(null);
  const hasTouchRef = useRef<boolean>(false);

  useEffect(() => {
    hasTouchRef.current = typeof window !== 'undefined' && 'ontouchstart' in window;
  }, []);

  // Touch handlers
  function onTouchStart(e: React.TouchEvent) {
    if (busy) return;
    if (!hasTouchRef.current) return;
    // Only start tracking when the page is already at the top
    if (window.scrollY > 2) return;
    startYRef.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (busy || startYRef.current == null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) {
      setPull(0);
      return;
    }
    const dampened = Math.min(dy * RESISTANCE, MAX_PULL);
    setPull(dampened);
    // Prevent bouncy iOS overscroll once we're past the small threshold
    if (dampened > 4 && e.cancelable) {
      e.preventDefault();
    }
  }

  async function onTouchEnd() {
    if (busy || startYRef.current == null) return;
    const triggered = pull >= THRESHOLD;
    startYRef.current = null;
    if (triggered) {
      setBusy(true);
      setPull(THRESHOLD); // keep indicator visible while refreshing
      try {
        await onRefresh();
      } finally {
        setBusy(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }

  const showIndicator = pull > 4 || busy;
  const label = busy ? refreshingLabel : pull >= THRESHOLD ? releaseLabel : pullLabel;
  const indicatorOpacity = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { startYRef.current = null; setPull(0); }}
      style={{ position: 'relative' }}
    >
      {/* Indicator overlay */}
      <div
        aria-hidden={!showIndicator}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: showIndicator ? `${Math.max(pull, busy ? THRESHOLD : 0)}px` : 0,
          pointerEvents: 'none',
          opacity: indicatorOpacity,
          transition: pull === 0 ? 'height 220ms ease, opacity 220ms ease' : 'none',
          color: 'var(--gold)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.3px',
          paddingBottom: '8px',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            fontSize: '20px',
            lineHeight: 1,
            marginBottom: '4px',
            transform: busy
              ? 'none'
              : `rotate(${Math.min((pull / THRESHOLD) * 180, 180)}deg)`,
            transition: 'transform 120ms ease',
            animation: busy ? 'ptr-spin 0.8s linear infinite' : 'none',
          }}
        >
          {busy ? '↻' : '↓'}
        </span>
        <span>{label}</span>
      </div>

      {/* Children translated down by the pull amount */}
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pull === 0 || busy ? 'transform 220ms ease' : 'none',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes ptr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
