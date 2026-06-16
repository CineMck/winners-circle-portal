import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // Absolute base URL (NextResponse.redirect requires absolute URLs).
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', origin));

  const { data: profile } = await supabase
    .from('profiles').select('stripe_customer_id').eq('id', user.id).single();

  // No Stripe customer (free or comped members) — nothing to manage.
  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(new URL('/profile?billing=none', origin));
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/profile`,
    });
    return NextResponse.redirect(session.url);
  } catch (err) {
    // Most common cause: the Stripe Customer Portal has not been activated in the
    // Stripe Dashboard (Settings → Billing → Customer portal → Save).
    console.error('[stripe/portal] Failed to create billing portal session:', err);
    return NextResponse.redirect(new URL('/profile?billing=error', origin));
  }
}
