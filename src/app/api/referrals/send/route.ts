import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { rateLimit, tooManyRequests } from '@/lib/rateLimit';

/**
 * POST /api/referrals/send
 * Body: { email: string, personalNote?: string }
 *
 * Creates a referral record AND emails the prospect a join link.
 * Idempotent on (referrer_id, referred_email) — won't double-send to
 * the same address.
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

function buildInviteEmail(opts: {
  referrerName: string;
  inviteUrl: string;
  personalNote?: string;
}) {
  const { referrerName, inviteUrl, personalNote } = opts;
  const note = personalNote?.trim();
  const noteBlock = note
    ? `<tr><td style="padding: 20px 32px;">
         <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#161616;border-left:3px solid #c9a84c;border-radius:8px;">
           <tr><td style="padding:16px 18px;">
             <p style="margin:0 0 4px;color:#888;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;">A note from ${escapeHtml(referrerName)}</p>
             <p style="margin:0;color:#e5e5e5;font-size:14px;line-height:1.6;">${escapeHtml(note)}</p>
           </td></tr>
         </table>
       </td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>You're invited to the Winner's Circle</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f5f5f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#111;border:1px solid #1e1e1e;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <div style="font-size:36px;line-height:1;margin-bottom:8px;">🏆</div>
          <h1 style="margin:0;color:#c9a84c;font-size:22px;font-weight:800;letter-spacing:0.3px;">Winner's Circle</h1>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <h2 style="margin:0 0 8px;color:#f5f5f5;font-size:20px;font-weight:700;">You're invited.</h2>
          <p style="margin:0;color:#bbb;font-size:15px;line-height:1.6;">
            <strong style="color:#c9a84c;">${escapeHtml(referrerName)}</strong> thought you'd be a good fit for the Winner's Circle — a private mastermind community for ambitious entrepreneurs and high-performers.
          </p>
        </td></tr>
        ${noteBlock}
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0 0 8px;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">What you get inside</p>
          <ul style="margin:0;padding-left:20px;color:#ccc;font-size:14px;line-height:1.8;">
            <li>Weekly mastermind sessions with peers who get it</li>
            <li>Direct access to operators, founders, and coaches</li>
            <li>Member-only resource library and workshops</li>
            <li>Accountability challenges with real momentum</li>
          </ul>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;text-align:center;">
          <a href="${inviteUrl}" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">Join the Circle →</a>
          <p style="margin:18px 0 0;color:#666;font-size:12px;">Or paste this into your browser:<br/><span style="color:#888;word-break:break-all;">${escapeHtml(inviteUrl)}</span></p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #1e1e1e;text-align:center;">
          <p style="margin:0;color:#555;font-size:11px;line-height:1.6;">
            You're getting this because ${escapeHtml(referrerName)} referred you. Not interested? Just ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`referral:${user.id}`, 20, 60 * 60_000); // 20 per hour
    if (!rl.ok) return tooManyRequests(rl.retryAfter);

    const { email, personalNote } = await req.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const supabaseAdmin = admin();

    // Look up referrer profile
    const { data: referrer } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, email, referral_code')
      .eq('id', user.id)
      .single();
    if (!referrer) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Prevent referring yourself
    if (cleanEmail === referrer.email?.toLowerCase()) {
      return NextResponse.json({ error: "You can't refer yourself." }, { status: 400 });
    }

    // Check if they're already a member
    const { data: existingMember } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (existingMember) {
      return NextResponse.json(
        { error: 'That person is already a member of the Winner\'s Circle.' },
        { status: 400 }
      );
    }

    // Insert referral row (idempotent — ignore unique-violation duplicates)
    const { error: refErr } = await supabaseAdmin.from('referrals').insert({
      referrer_id: referrer.id,
      referred_email: cleanEmail,
      status: 'pending',
    });
    if (refErr && !refErr.message.toLowerCase().includes('duplicate')) {
      console.error('referrals insert error:', refErr);
      return NextResponse.json({ error: refErr.message }, { status: 500 });
    }

    // Build invite URL using referral code (or fall back to username)
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://winnerscircleportal.com';
    const refToken = referrer.referral_code || referrer.username;
    const inviteUrl = `${baseUrl}/signup?ref=${encodeURIComponent(refToken)}`;

    const referrerName = referrer.full_name || referrer.username || 'A Winner\'s Circle member';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'invites@neuluma.com';

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set — referral email not sent');
      return NextResponse.json(
        { error: 'Email service not configured on the server. The referral was recorded but the email was not sent.' },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = buildInviteEmail({
      referrerName,
      inviteUrl,
      personalNote: typeof personalNote === 'string' ? personalNote : undefined,
    });

    const { data, error: sendErr } = await resend.emails.send({
      from: `Winner's Circle <${fromEmail}>`,
      to: cleanEmail,
      replyTo: referrer.email || undefined,
      subject: `${referrerName} invited you to the Winner's Circle`,
      html,
    });

    if (sendErr) {
      console.error('resend send error:', sendErr);
      return NextResponse.json(
        { error: sendErr.message || 'Email send failed' },
        { status: 500 }
      );
    }

    console.info(`[referral] ${referrer.email} invited ${cleanEmail} — resend id=${data?.id}`);

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: `Invite sent to ${cleanEmail}`,
    });
  } catch (err) {
    console.error('referrals/send route error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
