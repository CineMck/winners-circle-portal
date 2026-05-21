import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const JOHN_EMAIL = process.env.AGENT_JOHN_EMAIL || 'john@wentworthre.com';

// ── Helper: find or create DM conversation ──
async function getOrCreateConversation(userAId: string, userBId: string): Promise<string | null> {
  const { data: aRows } = await supabaseAdmin
    .from('conversation_participants').select('conversation_id').eq('user_id', userAId);
  if (aRows && aRows.length > 0) {
    const ids = aRows.map(r => r.conversation_id);
    const { data: shared } = await supabaseAdmin
      .from('conversation_participants').select('conversation_id')
      .eq('user_id', userBId).in('conversation_id', ids);
    if (shared && shared.length > 0) return shared[0].conversation_id;
  }
  const { data: conv, error } = await supabaseAdmin
    .from('conversations').insert({}).select('id').single();
  if (error || !conv) return null;
  await supabaseAdmin.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: userAId },
    { conversation_id: conv.id, user_id: userBId },
  ]);
  return conv.id;
}

// POST /api/agent/outreach
// Body: { reportId, items: [{ userId, message }] }
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportId, items } = await req.json() as {
      reportId: string;
      items: Array<{ userId: string; message: string }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Get John's user ID
    const { data: johnProfile } = await supabaseAdmin
      .from('profiles').select('id').ilike('email', JOHN_EMAIL).single();

    if (!johnProfile) {
      return NextResponse.json({ error: 'John\'s account not found. Check AGENT_JOHN_EMAIL env var.' }, { status: 500 });
    }

    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    for (const item of items) {
      try {
        const convId = await getOrCreateConversation(johnProfile.id, item.userId);
        if (!convId) {
          results.push({ userId: item.userId, success: false, error: 'Could not create conversation' });
          continue;
        }

        await supabaseAdmin.from('messages').insert({
          conversation_id: convId,
          sender_id: johnProfile.id,
          content: item.message,
        });
        await supabaseAdmin.from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId);

        results.push({ userId: item.userId, success: true });
      } catch (err) {
        results.push({ userId: item.userId, success: false, error: String(err) });
      }
    }

    // Update report: mark approved items as sent
    if (reportId && reportId !== 'unknown') {
      const { data: report } = await supabaseAdmin
        .from('agent_reports').select('suggested_outreach').eq('id', reportId).single();
      if (report) {
        const sentUserIds = new Set(results.filter(r => r.success).map(r => r.userId));
        const updated = (report.suggested_outreach as Array<{ userId: string; sent: boolean; approved: boolean | null }>).map(item => ({
          ...item,
          sent: sentUserIds.has(item.userId) ? true : item.sent,
          approved: sentUserIds.has(item.userId) ? true : item.approved,
        }));
        await supabaseAdmin.from('agent_reports')
          .update({ suggested_outreach: updated, status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', reportId);
      }
    }

    const sent = results.filter(r => r.success).length;
    return NextResponse.json({ sent, total: items.length, results });
  } catch (err) {
    console.error('Outreach error:', err);
    return NextResponse.json({ error: 'Failed', details: String(err) }, { status: 500 });
  }
}
