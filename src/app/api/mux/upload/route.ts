import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getMux, muxStreamUrl } from '@/lib/mux';

// Member feed videos are uploaded directly to Mux (resumable, transcoded to
// adaptive HLS). Course videos are unaffected (they use YouTube/Vimeo embeds).

export const dynamic = 'force-dynamic';

/**
 * POST /api/mux/upload
 * Auth-gated. Creates a Mux direct-upload URL the client uploads to.
 * Returns { url, id } where `id` is the upload id used for polling.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow the upload to be posted from the browser / Capacitor webview.
    const origin = req.headers.get('origin') || '*';

    const mux = getMux();
    const upload = await mux.video.uploads.create({
      cors_origin: origin,
      new_asset_settings: {
        playback_policy: ['public'],
        video_quality: 'basic', // free encoding tier
        passthrough: user.id,    // ties the asset back to the uploader
      },
    });

    return NextResponse.json({ url: upload.url, id: upload.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create upload';
    console.error('Mux upload create error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/mux/upload?id=<uploadId>
 * Auth-gated. Polls the upload → asset and returns the playback id once the
 * asset exists. `ready` becomes true when the video is fully playable.
 *   { state: 'waiting' }                              — asset not created yet
 *   { state: 'ready', playbackId, streamUrl, ready }  — playback id assigned
 *   { state: 'errored', error }                       — upload/asset failed
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const mux = getMux();
    const upload = await mux.video.uploads.retrieve(id);

    if (upload.status === 'errored' || upload.error) {
      return NextResponse.json({ state: 'errored', error: upload.error?.message || 'Upload failed' });
    }
    if (!upload.asset_id) {
      return NextResponse.json({ state: 'waiting' });
    }

    const asset = await mux.video.assets.retrieve(upload.asset_id);
    if (asset.status === 'errored') {
      return NextResponse.json({ state: 'errored', error: 'Asset processing failed' });
    }

    const playbackId = asset.playback_ids?.[0]?.id;
    if (!playbackId) {
      return NextResponse.json({ state: 'waiting' });
    }

    return NextResponse.json({
      state: 'ready',
      playbackId,
      streamUrl: muxStreamUrl(playbackId),
      ready: asset.status === 'ready',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to check upload';
    console.error('Mux upload status error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
