import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TIER_LABELS: Record<string, string> = {
  free: 'Free Member',
  core: 'Core Member',
  elite: 'Elite Member',
  founding: 'Founding Member',
};

function buildInviteEmail({
  inviterName,
  inviteeEmail,
  tier,
  message,
  inviteUrl,
  appUrl,
}: {
  inviterName: string;
  inviteeEmail: string;
  tier: string;
  message: string;
  inviteUrl: string;
  appUrl: string;
}) {
  const tierLabel = TIER_LABELS[tier] || 'Member';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to The Winner's Circle</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="text-align:center;padding-bottom:32px;">
          <div style="font-size:32px;margin-bottom:8px;">🏆</div>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#c9a84c;letter-spacing:-0.5px;">
            The Winner's Circle
          </h1>
          <p style="margin:6px 0 0;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:1px;">
            Private Mastermind Community
          </p>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111111;border:1px solid #1e1e1e;border-top:3px solid #c9a84c;border-radius:16px;padding:40px;">

          <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;">
            You've been invited
          </h2>
          <p style="margin:0 0 24px;font-size:15px;color:#888;">
            ${inviterName} has invited you to join as a
            <strong style="color:#c9a84c;">${tierLabel}</strong>.
          </p>

          ${message ? `
          <!-- Custom message -->
          <div style="background:#161616;border-left:3px solid #c9a84c;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0;font-size:14px;color:#cccccc;line-height:1.6;font-style:italic;">"${message}"</p>
            <p style="margin:8px 0 0;font-size:12px;color:#666;">— ${inviterName}</p>
          </div>` : ''}

          <!-- What you get -->
          <div style="margin-bottom:28px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;">
              What's waiting for you
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${[
                '🎯 Access to exclusive challenges & XP rewards',
                '💬 Private community channels with top performers',
                '📊 Progress tracking & accountability tools',
                '🏅 Earn badges and climb the leaderboard',
              ].map(item => `
              <tr><td style="padding:6px 0;">
                <span style="font-size:14px;color:#cccccc;">${item}</span>
              </td></tr>`).join('')}
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0 24px;">
            <a href="${inviteUrl}"
              style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-weight:800;font-size:16px;
                     text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.3px;">
              Accept Invitation →
            </a>
          </div>
          <p style="text-align:center;margin:0;font-size:12px;color:#555;">
            This invite link expires in 24 hours.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
            This invitation was sent to ${inviteeEmail} by ${inviterName}.<br />
            If you weren't expecting this, you can safely ignore it.<br />
            <a href="${appUrl}" style="color:#c9a84c;text-decoration:none;">winners-circle-portal-production.up.railway.app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    // Only admins/moderators may invite members and assign tiers — this route
    // uses the service-role key to mint invite links and pre-create profiles.
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: me } = await auth.from('profiles').select('role').eq('id', user.id).single();
    if (!me || !['admin', 'moderator'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, tier, message, inviterName } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winners-circle-portal-production.up.railway.app';

    // Generate invite link via Supabase admin (does NOT send Supabase's default email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${appUrl}/auth/setup`,
      },
    });

    if (linkError) {
      console.error('Supabase invite link error:', linkError);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    const inviteUrl = linkData?.properties?.action_link;
    if (!inviteUrl) {
      return NextResponse.json({ error: 'Could not generate invite link' }, { status: 500 });
    }

    // Pre-create the profile record with the desired tier
    // (will be overwritten by the profile trigger on signup if needed)
    const userId = linkData?.user?.id;
    if (userId && tier && tier !== 'free') {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email,
        tier,
        role: 'member',
        full_name: email.split('@')[0],
        username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_'),
      }, { onConflict: 'id', ignoreDuplicates: false });
    }

    // Send the invite email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey === 'REPLACE_ME') {
      // Resend not configured — return the raw link so admin can share manually
      return NextResponse.json({
        success: true,
        manualLink: inviteUrl,
        warning: 'RESEND_API_KEY not configured. Share this link manually.',
      });
    }

    const resend = new Resend(resendKey);
    const fromDomain = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { error: emailError } = await resend.emails.send({
      from: `The Winner's Circle <${fromDomain}>`,
      to: email,
      subject: `You've been invited to The Winner's Circle`,
      html: buildInviteEmail({
        inviterName: inviterName || "The Winner's Circle Team",
        inviteeEmail: email,
        tier: tier || 'free',
        message: message || '',
        inviteUrl,
        appUrl,
      }),
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      // Email failed but invite link was generated — return link for manual sharing
      return NextResponse.json({
        success: true,
        manualLink: inviteUrl,
        warning: `Email delivery failed: ${emailError.message}. Share this link manually.`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Invite route error:', err);
    return NextResponse.json({ error: 'Invite failed' }, { status: 500 });
  }
}
