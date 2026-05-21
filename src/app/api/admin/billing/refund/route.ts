import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

async function checkAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!p || !['admin', 'moderator'].includes(p.role)) return null;
  return user;
}

// POST /api/admin/billing/refund
// Body: { chargeId, amountCents? (omit for full refund), reason? }
export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { chargeId, amountCents, reason = 'requested_by_customer' } = await req.json();

  if (!chargeId) {
    return NextResponse.json({ error: 'chargeId is required' }, { status: 400 });
  }

  try {
    const refundParams: Stripe.RefundCreateParams = {
      charge: chargeId,
      reason: reason as Stripe.RefundCreateParams.Reason,
    };
    if (amountCents) refundParams.amount = amountCents;

    const refund = await stripe.refunds.create(refundParams);

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
