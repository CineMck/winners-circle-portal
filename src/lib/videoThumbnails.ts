/**
 * Client-side video thumbnail generation.
 *
 * Loads a selected video file into an off-DOM <video>, seeks to a few
 * timestamps, and draws each frame to a <canvas> → JPEG Blob. Used by
 * PostComposer so users can pick a poster frame for their uploaded video.
 *
 * Notes:
 * - Runs entirely in the browser; no server transcoding needed.
 * - iOS / Capacitor WebView can occasionally produce blank frames for HEVC.
 *   Callers should always offer an "upload your own image" fallback and
 *   handle an empty return array gracefully.
 */

export interface VideoThumb {
  url: string;   // object URL for preview (revoke when done)
  blob: Blob;    // JPEG blob to upload
}

const MAX_THUMB_WIDTH = 640;
const TIMEOUT_MS = 15000;

/**
 * Generate up to `count` candidate thumbnails from a video file.
 * Resolves with whatever frames could be captured (possibly empty).
 */
export function generateVideoThumbnails(file: Blob, count = 3): Promise<VideoThumb[]> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve([]); return; }

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const objectUrl = URL.createObjectURL(file);
    const thumbs: VideoThumb[] = [];
    let timestamps: number[] = [];
    let idx = 0;
    let done = false;

    video.preload = 'metadata';
    video.muted = true;
    (video as HTMLVideoElement & { playsInline: boolean }).playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = objectUrl;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      resolve(thumbs);
    };

    const timer = setTimeout(finish, TIMEOUT_MS);

    const seekNext = () => {
      if (idx >= timestamps.length) { finish(); return; }
      try {
        video.currentTime = timestamps[idx];
      } catch {
        finish();
      }
    };

    video.onloadedmetadata = () => {
      const d = video.duration;
      if (!d || !isFinite(d) || d <= 0) { finish(); return; }

      const vw = video.videoWidth || 320;
      const vh = video.videoHeight || 240;
      const scale = vw > MAX_THUMB_WIDTH ? MAX_THUMB_WIDTH / vw : 1;
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);

      // Sample frames spread across the clip, skipping the very start/end
      // (which are often black). E.g. for count=3 → 15%, 45%, 75%.
      timestamps = Array.from({ length: count }, (_, i) => {
        const frac = 0.15 + (0.6 * i) / Math.max(count - 1, 1);
        return Math.min(Math.max(d * frac, 0.1), Math.max(d - 0.1, 0.1));
      });
      seekNext();
    };

    video.onseeked = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { idx++; seekNext(); return; }
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) thumbs.push({ url: URL.createObjectURL(blob), blob });
            idx++;
            seekNext();
          },
          'image/jpeg',
          0.8
        );
      } catch {
        idx++;
        seekNext();
      }
    };

    video.onerror = finish;
  });
}
