import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to subscribe.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const priceId = body?.priceId;
    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json({ error: 'Missing priceId in request body.' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Server is not configured for payments yet — STRIPE_SECRET_KEY is missing.' },
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

    // Base plan promo: $19.95/mo with a free 30-day trial (card collected at
    // checkout, billing starts after the first month).
    const isBasePromo =
      !!process.env.NEXT_PUBLIC_STRIPE_BASE_PROMO_PRICE_ID &&
      priceId === process.env.NEXT_PUBLIC_STRIPE_BASE_PROMO_PRICE_ID;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : (profile?.email || user.email || undefined),
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/home?upgraded=true`,
      cancel_url: `${baseUrl}/upgrade`,
      metadata: { userId: user.id },
      subscription_data: {
        metadata: { userId: user.id },
        ...(isBasePromo ? { trial_period_days: 30 } : {}),
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('stripe/checkout error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
