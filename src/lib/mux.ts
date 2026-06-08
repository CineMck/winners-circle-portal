/**
 * Server-only Mux client.
 *
 * Requires MUX_TOKEN_ID and MUX_TOKEN_SECRET (a Mux access token with
 * Video read/write) in the environment. Create one at:
 *   Mux Dashboard → Settings → Access Tokens.
 *
 * Used by /api/mux/* routes for direct uploads. Never import this from a
 * client component — it would leak the secret.
 */
import Mux from '@mux/mux-node';

let cached: Mux | null = null;

export function getMux(): Mux {
  if (cached) return cached;
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error('Mux is not configured (missing MUX_TOKEN_ID / MUX_TOKEN_SECRET).');
  }
  cached = new Mux({ tokenId, tokenSecret });
  return cached;
}

/** Public HLS stream URL for a playback ID (stored in posts.media_urls). */
export function muxStreamUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}
