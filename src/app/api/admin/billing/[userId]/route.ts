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

// GET /api/admin/billing/[userId]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await params;
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, subscription_status, tier, is_comped')
    .eq('id', userId)
    .single();

  if (!profile) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // No Stripe customer yet
  if (!profile.stripe_customer_id) {
    return NextResponse.json({
      hasStripe: false,
      subscription: null,
      invoices: [],
      customer: null,
      paymentMethod: null,
      is_comped: profile.is_comped,
    });
  }

  try {
    // Fetch customer, subscription, and invoices in parallel
    const [customer, invoicesResult] = await Promise.all([
      stripe.customers.retrieve(profile.stripe_customer_id, {
        expand: ['default_source', 'invoice_settings.default_payment_method'],
      }) as Promise<Stripe.Customer>,
      stripe.invoices.list({
        customer: profile.stripe_customer_id,
        limit: 20,
      }),
    ]);

    let subscription = null;
    if (profile.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id, {
          expand: ['default_payment_method', 'latest_invoice'],
        });
      } catch {
        // Subscription may have been deleted
        subscription = null;
      }
    }

    // Get default payment method info
    let paymentMethod = null;
    const pmId = (subscription as Stripe.Subscription & { default_payment_method?: Stripe.PaymentMethod })?.default_payment_method
      || (customer.invoice_settings as Stripe.Customer.InvoiceSettings & { default_payment_method?: Stripe.PaymentMethod })?.default_payment_method;

    if (pmId && typeof pmId === 'object') {
      paymentMethod = pmId;
    } else if (typeof pmId === 'string') {
      try { paymentMethod = await stripe.paymentMethods.retrieve(pmId); } catch { /* ignore */ }
    }

    return NextResponse.json({
      hasStripe: true,
      customer: {
        id: customer.id,
        balance: customer.balance, // negative = credit
        currency: customer.currency,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        trialEnd: subscription.trial_end,
        cancelAt: subscription.cancel_at,
        items: subscription.items.data.map(i => ({
          priceId: i.price.id,
          amount: i.price.unit_amount,
          currency: i.price.currency,
          interval: i.price.recurring?.interval,
          productId: i.price.product,
        })),
      } : null,
      invoices: invoicesResult.data.map(inv => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        dueDate: inv.due_date,
        hostedUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
        description: inv.description || inv.lines?.data[0]?.description,
        chargeId: inv.charge as string | null,
      })),
      paymentMethod: paymentMethod ? {
        brand: (paymentMethod as Stripe.PaymentMethod).card?.brand,
        last4: (paymentMethod as Stripe.PaymentMethod).card?.last4,
        expMonth: (paymentMethod as Stripe.PaymentMethod).card?.exp_month,
        expYear: (paymentMethod as Stripe.PaymentMethod).card?.exp_year,
      } : null,
      is_comped: profile.is_comped,
    });
  } catch (err) {
    console.error('Stripe billing fetch error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
