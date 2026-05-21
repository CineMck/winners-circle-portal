import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { blocksToHtml, wrapInEmailTemplate, type Block } from '@/lib/email/blocks';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/admin/send-email
// Body: { subject, htmlBody, tier, blocks?, campaignName?, campaignId? }
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subject, htmlBody, tier, blocks, campaignName, campaignId } = await req.json() as {
      subject: string;
      htmlBody: string;
      tier: string;
      blocks?: Block[];
      campaignName?: string;
      campaignId?: string;
    };

    if (!subject?.trim() || !htmlBody?.trim()) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    // Fetch recipient emails
    let query = supabaseAdmin.from('profiles').select('email, full_name');
    if (tier === 'paid') {
      query = query.in('tier', ['core', 'elite', 'founding']);
    } else if (tier !== 'all') {
      query = query.eq('tier', tier);
    }
    const { data: members, error: membersErr } = await query;
    if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 500 });
    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'No recipients found for that filter' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winners-circle.up.railway.app';

    // Build styled email HTML — use shared blocks library if blocks provided
    const bodyHtml = blocks && blocks.length > 0 ? blocksToHtml(blocks) : htmlBody;
    const fullHtml = wrapInEmailTemplate(subject, bodyHtml, appUrl);

    // Send in batches of 50 (Resend batch limit)
    const emails = members.map(m => ({
      from: `John Wentworth <${process.env.RESEND_FROM_EMAIL || 'noreply@wentworthre.com'}>`,
      to: m.email,
      subject,
      html: fullHtml,
    }));

    let sent = 0;
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await resend.batch.send(batch);
      sent += batch.length;
    }

    // Save/update campaign record
    const campaignData = {
      name: campaignName || subject,
      subject,
      blocks: blocks || [],
      html_body: fullHtml,
      tier,
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sent,
    };

    if (campaignId) {
      await supabaseAdmin.from('email_campaigns').update({
        ...campaignData,
        updated_at: new Date().toISOString(),
      }).eq('id', campaignId);
    } else {
      await supabaseAdmin.from('email_campaigns').insert({
        ...campaignData,
        created_by: user.id,
      });
    }

    return NextResponse.json({ success: true, sent });
  } catch (err) {
    console.error('send-email error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
