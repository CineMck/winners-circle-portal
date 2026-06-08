/**
 * Client-side Mux upload for member feed videos.
 *
 * 1. Asks our server for a direct-upload URL (/api/mux/upload).
 * 2. Uploads the file to Mux with UpChunk — chunked + resumable, so a dropped
 *    mobile connection retries the chunk instead of restarting the whole file.
 * 3. Polls until Mux assigns a playback id, then returns the HLS stream URL
 *    (stored in posts.media_urls). The asset may still be "preparing" — it
 *    becomes playable a few seconds later; the post's poster image covers the gap.
 */
import * as UpChunk from '@mux/upchunk';

export interface MuxUploadResult {
  streamUrl: string;   // https://stream.mux.com/<playbackId>.m3u8
  playbackId: string;
}

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 90_000;

export async function uploadVideoToMux(
  file: File,
  onProgress?: (pct: number) => void
): Promise<MuxUploadResult> {
  // 1. Get a direct-upload URL from our server.
  const res = await fetch('/api/mux/upload', { method: 'POST' });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Could not start video upload' }));
    throw new Error(error || 'Could not start video upload');
  }
  const { url, id } = await res.json();
  if (!url || !id) throw new Error('Invalid upload response from server');

  // 2. Chunked, resumable upload straight to Mux.
  await new Promise<void>((resolve, reject) => {
    const upload = UpChunk.createUpload({ endpoint: url, file });
    upload.on('error', (e: { detail?: { message?: string } }) =>
      reject(new Error(e?.detail?.message || 'Video upload failed'))
    );
    upload.on('progress', (e: { detail?: number }) => {
      if (typeof e?.detail === 'number') onProgress?.(e.detail);
    });
    upload.on('success', () => resolve());
  });

  // 3. Poll for the playback id.
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const statusRes = await fetch(`/api/mux/upload?id=${encodeURIComponent(id)}`);
    const data = await statusRes.json().catch(() => ({}));
    if (data.state === 'ready' && data.playbackId) {
      return { streamUrl: data.streamUrl, playbackId: data.playbackId };
    }
    if (data.state === 'errored') {
      throw new Error(data.error || 'Mux could not process the video');
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Video is taking longer than expected to process. Please try again.');
}

export { isMuxUrl, muxPlaybackId } from '@/lib/muxPlayback';
