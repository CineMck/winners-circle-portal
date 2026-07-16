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
  if (!p || p.role !== 'admin') return null; // money-movement: admins only (not moderators)
  return user;
}

// POST /api/admin/billing/subscription
// Body: { userId, action: 'cancel_period_end' | 'cancel_immediately' | 'retry_payment' | 'uncancel' }
export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, action } = await req.json();

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
  }

  const subId = profile.stripe_subscription_id;

  try {
    switch (action) {
      case 'cancel_period_end': {
        // Cancel at end of current billing period (graceful)
        const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
        await supabaseAdmin.from('profiles').update({ subscription_status: 'cancel_at_period_end' }).eq('id', userId);
        return NextResponse.json({ success: true, cancelAt: sub.cancel_at });
      }

      case 'uncancel': {
        // Re-enable a subscription set to cancel at period end
        await stripe.subscriptions.update(subId, { cancel_at_period_end: false });
        await supabaseAdmin.from('profiles').update({ subscription_status: 'active' }).eq('id', userId);
        return NextResponse.json({ success: true });
      }

      case 'cancel_immediately': {
        // Cancel subscription right now — member loses access
        await stripe.subscriptions.cancel(subId);
        await supabaseAdmin.from('profiles').update({
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          tier: 'free',
        }).eq('id', userId);
        return NextResponse.json({ success: true });
      }

      case 'retry_payment': {
        // Attempt to pay the latest unpaid invoice
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ['latest_invoice'] });
        const latestInvoice = sub.latest_invoice as Stripe.Invoice;
        if (!latestInvoice?.id) return NextResponse.json({ error: 'No invoice to retry' }, { status: 400 });
        const paid = await stripe.invoices.pay(latestInvoice.id);
        if (paid.status === 'paid') {
          await supabaseAdmin.from('profiles').update({ subscription_status: 'active' }).eq('id', userId);
        }
        return NextResponse.json({ success: true, invoiceStatus: paid.status });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
