import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/re-promo-checkout
 *
 * Starts the Real Estate Promo membership:
 *   - $300 charged now, covering the first 4 months
 *   - $150 / month starting in month 5
 *
 * Implemented as a subscription started on the intro price
 * (STRIPE_RE_PROMO_INTRO_PRICE_ID = $300 every 4 months). The Stripe webhook
 * then attaches a subscription schedule so it transitions to the monthly price
 * (STRIPE_RE_PROMO_MONTHLY_PRICE_ID = $150/mo) after the first 4-month cycle.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to join.' }, { status: 401 });
    }

    const introPrice = process.env.STRIPE_RE_PROMO_INTRO_PRICE_ID;
    const monthlyPrice = process.env.STRIPE_RE_PROMO_MONTHLY_PRICE_ID;
    if (!process.env.STRIPE_SECRET_KEY || !introPrice || !monthlyPrice) {
      return NextResponse.json(
        { error: 'Real Estate Promo billing is not configured yet.' },
        { status: 500 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    const baseUrl =
      (process.env.NEXT_PUBLIC_APP_URL || 'https://winnerscircleportal.com').replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : (profile?.email || user.email || undefined),
      line_items: [{ price: introPrice, quantity: 1 }],
      success_url: `${baseUrl}/home?welcome=re_promo`,
      cancel_url: `${baseUrl}/real-estate/join`,
      // Read by the webhook to flag this as the promo + drive the schedule.
      metadata: { userId: user.id, rePromo: '1' },
      subscription_data: { metadata: { userId: user.id, rePromo: '1' } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    console.error('re-promo-checkout error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
