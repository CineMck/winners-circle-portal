import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/admin/send-email
// Body: { subject, htmlBody, tier: 'all' | 'core' | 'elite' | 'founding' | 'paid' }
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subject, htmlBody, tier } = await req.json() as {
      subject: string;
      htmlBody: string;
      tier: string;
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

    // Build styled email HTML
    const fullHtml = buildEmailHtml({ subject, body: htmlBody, appUrl });

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

    return NextResponse.json({ success: true, sent });
  } catch (err) {
    console.error('send-email error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function buildEmailHtml({ subject, body, appUrl }: { subject: string; body: string; appUrl: string }) {
  // body is already HTML from the block editor — do not replace newlines

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111;border:1px solid #1e1e1e;border-top:4px solid #c9a84c;border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🏆</div>
            <div style="font-size:20px;font-weight:800;color:#c9a84c;letter-spacing:-0.3px;">The Winner's Circle</div>
            <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Private Mastermind Community</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;padding:32px 36px;">
            <h2 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#fff;line-height:1.3;">${subject}</h2>
            <div style="font-size:15px;color:#ccc;line-height:1.7;">${body}</div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#111;border-left:1px solid #1e1e1e;border-right:1px solid #1e1e1e;padding:0 36px 32px;text-align:center;">
            <a href="${appUrl}/home" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
              Open The Winner's Circle →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0d0d;border:1px solid #1e1e1e;border-top:1px solid #1a1a1a;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">
              You're receiving this as a member of The Winner's Circle.<br>
              <a href="${appUrl}/profile" style="color:#888;text-decoration:underline;">Manage your account</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
