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

// POST /api/admin/billing/charge
// Body: { userId, amountCents, description, sendEmail? }
export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, amountCents, description, sendEmail = true } = await req.json();

  if (!userId || !amountCents || amountCents < 50) {
    return NextResponse.json({ error: 'userId and amountCents (min 50) are required' }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id, full_name, email')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'Member has no Stripe customer ID' }, { status: 400 });
  }

  try {
    // Add invoice item then create + finalize invoice
    await stripe.invoiceItems.create({
      customer: profile.stripe_customer_id,
      amount: amountCents,
      currency: 'usd',
      description: description || 'Winner\'s Circle membership charge',
    });

    const invoice = await stripe.invoices.create({
      customer: profile.stripe_customer_id,
      auto_advance: false,
      collection_method: sendEmail ? 'send_invoice' : 'charge_automatically',
      days_until_due: sendEmail ? 7 : undefined,
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    // If charging automatically, attempt payment immediately
    if (!sendEmail) {
      try {
        await stripe.invoices.pay(finalized.id);
      } catch (payErr) {
        // Payment may fail — return invoice anyway
        console.warn('Auto-pay failed:', payErr);
      }
    }

    return NextResponse.json({
      success: true,
      invoiceId: finalized.id,
      hostedUrl: finalized.hosted_invoice_url,
      status: finalized.status,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
