# Base Plan Setup ($50/mo · $19.95 promo · free 30-day trial)

The Free plan is retired. New members start on the **Base** plan:

- **List price:** $50/month (shown crossed out as the anchor)
- **Launch promo:** $19.95/month ongoing
- **Free 30-day trial** — card collected at checkout, billing starts after the
  first month, cancel anytime
- **Access:** same as the old Free tier (1 Zoom call/month + free resources
  library + app access). Base does **not** unlock paid-group content
  (community channels, courses, challenges, premium resources).
- **Existing free members are grandfathered** — the `free` tier still exists
  internally, it's just no longer purchasable or shown on signup.

## 1. Database (do this FIRST)

Run `supabase/base_tier.sql` in the Supabase SQL editor:

```sql
ALTER TYPE member_tier ADD VALUE IF NOT EXISTS 'base';
```

Deploying the code before this runs will make webhook/admin tier updates fail
with an enum error.

## 2. Stripe product + prices

Run the setup script (TEST mode first):

```bash
cd winners-circle-portal-app
STRIPE_SECRET_KEY=sk_test_... node scripts/create-base-plan.mjs
```

It creates the product and two monthly prices ($50 list, $19.95 promo) and
prints the env vars. Re-running is safe (it reuses existing ones).

## 3. Railway env vars

```
NEXT_PUBLIC_STRIPE_BASE_PROMO_PRICE_ID=price_...   # $19.95/mo — what members buy
NEXT_PUBLIC_STRIPE_BASE_MONTHLY_PRICE_ID=price_... # $50/mo list/anchor
```

The checkout route (`/api/stripe/checkout`) detects the promo price ID and
adds `trial_period_days: 30` automatically. The webhook maps both price IDs to
the `base` tier and treats `trialing` subscriptions as in good standing.

## 4. MANDATORY test-mode verification

With test keys set locally (or on a Railway preview):

1. Sign up → pick **Base** → complete checkout with card `4242 4242 4242 4242`.
2. Stripe Dashboard → the subscription should show **Trialing**, $19.95/mo,
   first invoice ~30 days out for $19.95.
3. Portal profile should show tier **Base**, status `trialing`.
4. Advance the test clock (or wait for `customer.subscription.updated`) and
   confirm the tier stays `base` when the status flips to `active`.
5. Cancel the subscription → tier should drop to `free`.

Then repeat the script with `sk_live_...`, set the live env vars on Railway,
and redeploy.

## Ending the promo later

Point `NEXT_PUBLIC_STRIPE_BASE_PROMO_PRICE_ID` at the $50 price (or a new
price), and remove the crossed-out promo styling on the signup/upgrade/landing
cards. Existing $19.95 subscribers keep their price unless you migrate them.
