/**
 * Shared helpers for Elevate RE Mastermind emails (confirmation, reminders,
 * marketing). Branded wrapper + unsubscribe footer for CAN-SPAM compliance.
 */

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://winnerscircleportal.com').replace(/\/$/, '');

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

/** Format a call's start time for display (ET). */
export function formatCallTime(startsAt: string | Date): string {
  const d = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short',
  }).format(d);
}

/**
 * Wrap email body content in the branded shell. If an unsubscribe token is
 * supplied, append a compliant unsubscribe footer.
 */
export function reEmailShell(innerHtml: string, opts?: { unsubscribeToken?: string }): string {
  const unsub = opts?.unsubscribeToken
    ? `<p style="margin:24px 0 0;color:#666;font-size:11px;line-height:1.6;text-align:center;">
         The Winners Circle · Sent because you registered for an Elevate Real Estate Mastermind call.<br/>
         <a href="${APP_URL}/unsubscribe?token=${opts.unsubscribeToken}" style="color:#888;text-decoration:underline;">Unsubscribe</a> from these emails.
       </p>`
    : '';
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;">
    <tr><td style="text-align:center;padding-bottom:18px;">
      <span style="font-size:20px;font-weight:800;color:#c9a84c;letter-spacing:0.04em;">THE WINNERS CIRCLE</span>
    </td></tr>
    <tr><td style="background:#111;border:1px solid #1e1e1e;border-radius:14px;padding:28px;color:#f5f5f5;">
      ${innerHtml}
    </td></tr>
    <tr><td>${unsub}</td></tr>
  </table>
</body></html>`;
}
