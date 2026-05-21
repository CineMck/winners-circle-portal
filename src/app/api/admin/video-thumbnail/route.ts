import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/video-thumbnail?url=https://www.youtube.com/watch?v=...
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') || '';

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    const videoId = ytMatch[1];
    // Try maxresdefault first, fall back to hqdefault
    return NextResponse.json({
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      platform: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    try {
      const res = await fetch(
        `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}&width=640`,
        { headers: { 'User-Agent': 'WinnersCircle/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        // Use the larger thumbnail if available
        const thumbnail = data.thumbnail_url_with_play_button || data.thumbnail_url;
        return NextResponse.json({
          thumbnailUrl: thumbnail,
          platform: 'vimeo',
          videoId,
          title: data.title || '',
          embedUrl: `https://vimeo.com/${videoId}`,
        });
      }
    } catch { /* fall through */ }
  }

  return NextResponse.json({ error: 'Could not fetch thumbnail. Make sure the URL is a valid YouTube or Vimeo link.' }, { status: 400 });
}
