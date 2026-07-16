import { NextRequest, NextResponse } from 'next/server';
import { requireAdminForGhost, getJohnProfileId, ghostSupabaseAdmin } from '@/lib/ghostAuthor';

export const dynamic = 'force-dynamic';

// POST /api/admin/ghost/post
// Admin-only. Publishes a feed post under John Wentworth's account.
// Body: { content, channelId?, challengeId?, mediaUrls?, mediaThumbnails? }
// The insert records ghost_authored_by = the real admin (audit trail).
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminForGhost();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const content = String(body?.content ?? '').trim();
    const channelId = body?.channelId ? String(body.channelId) : null;
    const challengeId = body?.challengeId ? String(body.challengeId) : null;
    const mediaUrls = Array.isArray(body?.mediaUrls) ? body.mediaUrls.map(String).slice(0, 20) : [];
    const mediaThumbnails = Array.isArray(body?.mediaThumbnails) ? body.mediaThumbnails.map(String).slice(0, 20) : [];

    if (!content && mediaUrls.length === 0) {
      return NextResponse.json({ error: 'Nothing to post.' }, { status: 400 });
    }
    if (content.length > 10000) {
      return NextResponse.json({ error: 'Post is too long.' }, { status: 400 });
    }

    const johnId = await getJohnProfileId();
    if (!johnId) {
      return NextResponse.json({ error: "John's account not found. Check AGENT_JOHN_EMAIL." }, { status: 500 });
    }

    const { data, error } = await ghostSupabaseAdmin
      .from('posts')
      .insert({
        content,
        author_id: johnId,
        channel_id: channelId,
        challenge_id: challengeId,
        media_urls: mediaUrls,
        media_thumbnails: mediaThumbnails,
        ghost_authored_by: auth.adminId,
      })
      .select('*, author:profiles!author_id(*), channel:channels(*)')
      .single();

    if (error) {
      console.error('Ghost post error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (err) {
    console.error('Ghost post route error:', err);
    return NextResponse.json({ error: 'Failed to post.' }, { status: 500 });
  }
}
