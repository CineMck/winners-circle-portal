import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

const TIER_MAP: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_CORE_MONTHLY_PRICE_ID || '']: 'core',
  [process.env.NEXT_PUBLIC_STRIPE_CORE_ANNUAL_PRICE_ID || '']: 'core',
  [process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID || '']: 'elite',
  [process.env.NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID || '']: 'elite',
  [process.env.NEXT_PUBLIC_STRIPE_FOUNDING_MONTHLY_PRICE_ID || '']: 'founding',
  [process.env.NEXT_PUBLIC_STRIPE_FOUNDING_ANNUAL_PRICE_ID || '']: 'founding',
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.metadata?.userId;
      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const tier = TIER_MAP[priceId] || 'core';
        await supabase.from('profiles').update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          tier,
        }).eq('id', userId);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const tier = TIER_MAP[priceId] || 'core';
      await supabase.from('profiles').update({
        subscription_status: subscription.status,
        tier: subscription.status === 'active' ? tier : 'free',
      }).eq('stripe_subscription_id', subscription.id);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase.from('profiles').update({
        subscription_status: 'canceled',
        tier: 'free',
      }).eq('stripe_subscription_id', subscription.id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription;
      if (subscriptionId) {
        await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('stripe_subscription_id', subscriptionId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
