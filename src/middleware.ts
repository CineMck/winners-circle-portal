import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Normalize casing for the Real Estate landing page (/Real-Estate etc.)
  if (pathname.toLowerCase() === '/real-estate' && pathname !== '/real-estate') {
    return NextResponse.redirect(new URL('/real-estate', request.url));
  }

  // Public routes — pages anyone can visit, plus webhook + cron endpoints
  // that authenticate themselves with their own signing secret (Stripe,
  // Supabase Database Webhooks, scheduled-task cron).
  const publicRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/auth/callback',
    '/auth/setup',
    '/auth/reset',
    '/privacy',
    '/terms',
    '/install-guide',
    '/real-estate',
    '/api/real-estate/register',
    '/unsubscribe',
    '/api/unsubscribe',
    // Server-to-server webhook + cron endpoints (validate themselves via signature/secret)
    '/api/webhooks/',
    '/api/push/webhook',
    '/api/push/event-reminders',
    '/api/real-estate/reminders',
    '/api/automations/run',
    '/api/twilio/inbound',
  ];
  // Routes a signed-in user is still allowed to hit (don't bounce them to /home).
  const allowLoggedIn = [
    '/auth/reset', '/privacy', '/terms', '/real-estate', '/api/real-estate/register',
    '/unsubscribe', '/api/unsubscribe',
    '/api/webhooks/', '/api/push/webhook', '/api/push/event-reminders', '/api/real-estate/reminders',
    '/api/automations/run', '/api/twilio/inbound',
  ];
  if (pathname === '/' || publicRoutes.some(r => pathname.startsWith(r))) {
    if (user && !allowLoggedIn.some(r => pathname.startsWith(r)) && pathname !== '/') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return supabaseResponse;
  }

  // Protected routes
  if (!user) {
    // For API routes, return JSON 401 instead of redirecting — otherwise the
    // browser follows a 307 POST → 405 Method Not Allowed on the /login page.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin routes - check role
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
