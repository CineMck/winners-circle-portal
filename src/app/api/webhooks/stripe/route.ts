import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';
import { sendMetaEvent } from '@/lib/metaCapi';

const TIER_MAP: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_CORE_MONTHLY_PRICE_ID || '']: 'core',
  [process.env.NEXT_PUBLIC_STRIPE_CORE_ANNUAL_PRICE_ID || '']: 'core',
  [process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID || '']: 'elite',
  [process.env.NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID || '']: 'elite',
  [process.env.NEXT_PUBLIC_STRIPE_FOUNDING_MONTHLY_PRICE_ID || '']: 'founding',
  [process.env.NEXT_PUBLIC_STRIPE_FOUNDING_ANNUAL_PRICE_ID || '']: 'founding',
  // Real Estate Promo — both the $300/4-month intro price and the $150/mo price
  // keep the member on the re_promo tier.
  [process.env.STRIPE_RE_PROMO_INTRO_PRICE_ID || '']: 're_promo',
  [process.env.STRIPE_RE_PROMO_MONTHLY_PRICE_ID || '']: 're_promo',
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

        // Real Estate Promo: the customer just paid the $300 intro (covers 4
        // months). Attach a subscription schedule so it auto-transitions to the
        // $150/mo price after the first cycle instead of renewing the intro.
        if (session.metadata?.rePromo === '1') {
          const intro = process.env.STRIPE_RE_PROMO_INTRO_PRICE_ID;
          const monthly = process.env.STRIPE_RE_PROMO_MONTHLY_PRICE_ID;
          if (intro && monthly) {
            try {
              const sched = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });
              const phase0 = sched.phases[0];
              await stripe.subscriptionSchedules.update(sched.id, {
                end_behavior: 'release',
                phases: [
                  {
                    items: [{ price: intro, quantity: 1 }],
                    start_date: phase0.start_date,
                    end_date: phase0.end_date,
                  },
                  {
                    items: [{ price: monthly, quantity: 1 }],
                  },
                ],
              });
            } catch (e) {
              console.error('re_promo schedule setup failed:', e);
            }
          }
        }
        // Fire Meta Conversions API "Purchase" for the paid subscription.
        // Idempotent on the Stripe session ID (safe if the webhook retries).
        try {
          await sendMetaEvent({
            eventName: 'Purchase',
            eventId: session.id,
            email: session.customer_details?.email || undefined,
            value: (session.amount_total ?? 0) / 100,
            currency: (session.currency || 'usd').toUpperCase(),
            contentName: `Winners Circle ${tier} membership`,
          });
        } catch (e) {
          console.error('[stripe-webhook] Meta Purchase event failed:', e);
        }
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
