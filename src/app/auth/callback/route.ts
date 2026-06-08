import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Auth callback — magic link, email confirmation, OAuth all redirect here
 * with either a `code` query param (PKCE flow) or `token_hash` + `type`
 * (legacy OTP verify flow).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // Behind Railway's proxy, `url.origin` is the container's INTERNAL address
  // (e.g. http://localhost:8080), so redirecting to it bounces users to
  // localhost. Use the forwarded host/proto to rebuild the PUBLIC origin the
  // user actually came from (custom domain or the railway.app domain).
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  const supabase = await createClient();

  // 1. Modern PKCE flow — most common for magic links and signup confirms
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`
      );
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 2. Legacy flow — token_hash + type
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change',
      token_hash: tokenHash,
    });
    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message);
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_failed&reason=${encodeURIComponent(error.message)}`
      );
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // 3. No code or token — link is malformed
  console.error('[auth/callback] no code or token_hash in URL', { url: request.url });
  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed&reason=no_code`
  );
}
