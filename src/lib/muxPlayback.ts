/**
 * Dependency-free helpers for recognising Mux media stored in posts.media_urls.
 * Kept separate from muxUpload.ts so the feed (PostCard) doesn't pull the
 * UpChunk uploader into its bundle.
 */

/** True if a stored media URL points at a Mux HLS stream. */
export function isMuxUrl(url: string): boolean {
  return /stream\.mux\.com\/.+\.m3u8/.test(url);
}

/** Extract the playback id from a stored Mux stream URL. */
export function muxPlaybackId(url: string): string | null {
  const m = url.match(/stream\.mux\.com\/([^/.]+)\.m3u8/);
  return m ? m[1] : null;
}
