import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

async function checkAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || !['admin', 'moderator'].includes(p.role)) return null;
  return user;
}

// POST /api/admin/billing/comp
// Body: { userId, tier, cancelStripeSubscription? }
// Sets is_comped=true, overrides their tier, optionally cancels Stripe subscription
export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, tier = 'founding', cancelStripeSubscription = false } = await req.json();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_subscription_id, full_name')
    .eq('id', userId)
    .single();

  if (!profile) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  try {
    // Cancel Stripe subscription if requested
    if (cancelStripeSubscription && profile.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (e) {
        console.warn('Could not cancel subscription:', e);
      }
    }

    // Update profiles: set comped + tier + clear subscription if canceled
    const update: Record<string, unknown> = {
      is_comped: true,
      tier,
      subscription_status: cancelStripeSubscription ? 'comped' : undefined,
    };
    if (cancelStripeSubscription) {
      update.stripe_subscription_id = null;
    }

    await supabaseAdmin.from('profiles').update(update).eq('id', userId);

    return NextResponse.json({ success: true, tier, canceledSubscription: cancelStripeSubscription });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove comp (restore to free)
export async function DELETE(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await req.json();

  await supabaseAdmin.from('profiles').update({
    is_comped: false,
    tier: 'free',
    subscription_status: null,
  }).eq('id', userId);

  return NextResponse.json({ success: true });
}
