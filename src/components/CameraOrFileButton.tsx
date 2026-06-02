'use client';

import { useRef, useState } from 'react';
import { pickOrCapturePhoto, type PickedPhoto, isNative } from '@/lib/native';

interface Props {
  /** Called after the user has chosen a photo. */
  onPick: (photo: PickedPhoto) => void | Promise<void>;
  /** Override the button label. */
  label?: string;
  /** Class for the button — defaults to a small ghost style. */
  className?: string;
  /** Max edge length (camera plugin will downscale). */
  maxSize?: number;
  /** If true, hide the button while the parent is uploading. */
  disabled?: boolean;
  /** Force a specific source. Defaults to 'prompt' on native (Photo/Camera sheet). */
  source?: 'camera' | 'library' | 'prompt';
}

/**
 * Drop-in replacement for ad-hoc <input type="file"> + custom button.
 *
 * On native (iOS/Android in the Capacitor app) it shows a "Take photo or
 * choose from library" action sheet.
 *
 * On web it opens the regular file picker.
 *
 * Usage:
 *   <CameraOrFileButton onPick={async (p) => {
 *     const fd = new FormData();
 *     fd.append('file', p.blob, p.fileName);
 *     await fetch('/api/upload', { method: 'POST', body: fd });
 *   }} />
 */
export default function CameraOrFileButton({
  onPick, label, className, maxSize, disabled, source = 'prompt',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const photo = await pickOrCapturePhoto({
        source,
        fileInputRef: inputRef,
        maxSize,
      });
      if (photo) await onPick(photo);
    } finally {
      setBusy(false);
    }
  }

  const buttonLabel =
    label ??
    (isNative() ? 'Take or choose photo' : 'Choose photo');

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy}
        className={className ?? 'btn-ghost'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text)',
          fontSize: 13,
          cursor: busy || disabled ? 'wait' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {busy ? 'Loading…' : buttonLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
      />
    </>
  );
}
