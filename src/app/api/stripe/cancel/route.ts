import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/cancel
 *
 * Cancels the current user's Stripe subscription at the end of the billing
 * period — they keep access until then. The existing webhook handler updates
 * the member's tier to 'free' once Stripe fires customer.subscription.deleted
 * (which happens at period end).
 *
 * Body: { immediate?: boolean } — if true, cancels right now instead of at period end
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const immediate = body?.immediate === true;

    let updated;
    if (immediate) {
      updated = await stripe.subscriptions.cancel(profile.stripe_subscription_id);
    } else {
      updated = await stripe.subscriptions.update(profile.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    const periodEndUnix =
      (updated as unknown as { current_period_end?: number }).current_period_end;
    const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;

    return NextResponse.json({
      success: true,
      immediate,
      cancelAt: periodEnd,
      message: immediate
        ? 'Subscription canceled. You\'ve been downgraded to Free.'
        : `Your membership will end on ${periodEnd ? new Date(periodEnd).toLocaleDateString() : 'the next billing date'}. You'll keep full access until then.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cancel failed';
    console.error('stripe/cancel error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
