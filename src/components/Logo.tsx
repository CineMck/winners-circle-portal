/**
 * Winner's Circle brand logo.
 *
 * Use this in brand-relevant spots (auth headers, topbar, splash). Don't
 * use it to replace the decorative 🏆 emoji that appears next to feature
 * labels like "Leaderboard" or "#wins channel" — those should remain emoji.
 *
 * Default size is 64x64. Override with the `size` prop.
 */

import Image from 'next/image';

interface Props {
  /** Width/height in px. Square. Default 64. */
  size?: number;
  /** Wrap the image in a gold-rimmed circle (matches old trophy-emoji style). */
  ring?: boolean;
  /** Extra inline styles on the outer element. */
  style?: React.CSSProperties;
  className?: string;
  /** Alt text — defaults to "Winner's Circle". */
  alt?: string;
  /** Set to true if the image needs no priority (e.g. below the fold). */
  lazy?: boolean;
}

export default function Logo({
  size = 64,
  ring = false,
  style,
  className,
  alt = "Winner's Circle",
  lazy = false,
}: Props) {
  const inner = (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={!lazy}
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );

  if (!ring) {
    return (
      <span
        className={className}
        style={{ display: 'inline-block', width: size, height: size, ...style }}
      >
        {inner}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--gold-dim)',
        border: '2px solid var(--gold)',
        padding: Math.round(size * 0.08),
        ...style,
      }}
    >
      <span style={{ width: '100%', height: '100%', display: 'block' }}>{inner}</span>
    </span>
  );
}
