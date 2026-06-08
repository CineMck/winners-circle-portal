# Mux setup — feed video uploads

Member **feed** videos now upload to Mux (transcoded to adaptive HLS, served from
Mux's CDN). Course/lesson videos are unchanged — they still use YouTube/Vimeo embeds.
Images and avatars still go to Supabase Storage.

## One-time setup

1. **Create a Mux account** at https://mux.com and add a payment method
   (Settings → Billing). Pricing is usage-based; the integration requests the
   free **`basic`** encoding tier.
2. **Create an API access token**: Mux Dashboard → Settings → Access Tokens →
   *Generate new token*. Give it **Mux Video → Read and Write**. Copy the
   **Token ID** and **Token Secret** (the secret is shown only once).
3. **Add the env vars on Railway** (portal app service → Variables):
   ```
   MUX_TOKEN_ID=...
   MUX_TOKEN_SECRET=...
   ```
   Redeploy after saving. No client-side/`NEXT_PUBLIC_` key is needed — playback
   uses public playback IDs, and uploads are authorized per-request by our server.

That's it. No webhook is required for the MVP; the app polls Mux for the playback
ID right after upload.

## How it works

- `POST /api/mux/upload` (auth-gated) creates a Mux direct-upload URL.
- The browser uploads the file to Mux with **UpChunk** (chunked + resumable, so a
  dropped mobile connection retries a chunk instead of the whole file).
- The app polls `GET /api/mux/upload?id=…` until Mux assigns a playback ID, then
  stores `https://stream.mux.com/<playbackId>.m3u8` in `posts.media_urls`.
- The poster frame the user picks is uploaded to Supabase and stored in
  `posts.media_thumbnails`, so the feed shows an image instantly while Mux finishes
  transcoding (usually a few seconds).
- `PostCard` renders Mux entries with **Mux Player** (`preload="none"` + poster);
  legacy Supabase `.mp4/.mov` posts still play via the plain `<video>` path.

## Cost controls

- Encoding uses `video_quality: 'basic'` (free encoding tier).
- Playback policy is `public`. To gate videos to logged-in members later, switch
  to signed playback IDs (add a signing key + a server route that mints short-lived
  tokens, and pass the token to Mux Player). Nothing else in the flow changes.

## Notes / future

- **Migration**: existing Supabase feed videos keep playing from their old URLs —
  only new uploads use Mux.
- **Webhooks** (optional hardening): instead of polling, subscribe to
  `video.asset.ready` to update posts; useful if very long videos sometimes exceed
  the 90s poll window.
- **Prerequisite migration**: `supabase/add_post_media_thumbnails.sql` must already
  be applied (it adds `posts.media_thumbnails`).
