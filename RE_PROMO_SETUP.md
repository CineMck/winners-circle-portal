# Real Estate Promo tier — setup

The `re_promo` tier gives members the **same access and appearance as Core**, but
with promotional billing:

- **$300 charged today**, covering the first 4 months
- **$150 / month** starting in month 5
- Cancel anytime

Members see themselves as a Core member; only admins can tell (via the member's
tier in the admin panel and the Stripe subscription).

## 1. Create the Stripe products/prices

In the Stripe Dashboard → **Products** → create one product (e.g. "Real Estate
Promo"), then add **two recurring prices** under it:

| Price | Amount | Billing period | Used for |
|-------|--------|----------------|----------|
| Intro | **$300.00** | every **4 months** (recurring, interval = month, count = 4) | First cycle, charged at signup |
| Monthly | **$150.00** | every **1 month** | Ongoing, from month 5 |

Both must be **recurring** prices (not one-time). Copy each price ID (`price_…`).

> How it works: checkout starts the subscription on the **Intro** price (so $300
> is charged now and covers 4 months). The Stripe webhook then attaches a
> **subscription schedule** that switches it to the **Monthly** price after the
> first 4-month cycle. No renewal at $300 — it transitions to $150/mo.

## 2. Add env vars (Railway → portal service → Variables)

```
STRIPE_RE_PROMO_INTRO_PRICE_ID=price_xxx     # the $300 / 4-month price
STRIPE_RE_PROMO_MONTHLY_PRICE_ID=price_yyy   # the $150 / month price
```

(These are server-only — no `NEXT_PUBLIC_` prefix.) Redeploy after saving.

## 3. The signup link

Send Real Estate prospects to:

```
https://winnerscircleportal.com/real-estate/join
```

- Logged-out visitors get prompted to create an account / sign in first.
- Signed-in users see the plan summary and a "Start membership" button that opens
  Stripe Checkout for the promo.
- On success they're returned to the app as a Core-equivalent member.

You can link to this from the `/real-estate` funnel, an email, or anywhere.

## 4. IMPORTANT: test in Stripe test mode first

Because the phased billing (intro → schedule → monthly) can't be verified without
a real Stripe account, **run a full test in Stripe test mode** before going live:

1. Use test price IDs + test keys.
2. Go through `/real-estate/join` checkout with a Stripe test card.
3. In the Stripe Dashboard, confirm:
   - A $300 charge happened now.
   - The subscription has a **schedule** with phase 1 = Intro (1 cycle) → phase 2 = Monthly.
   - Use Stripe's "advance clock" test tooling to confirm the $150/mo kicks in after 4 months.
4. Confirm the member's tier shows `re_promo` in the admin panel and `Core` to members.

## Notes / caveats
- If the webhook's schedule step ever fails (logged as `re_promo schedule setup failed`),
  the subscription would otherwise renew at the intro price ($300/4mo ≈ $75/mo) — an
  under-charge, not an over-charge. Watch logs after launch; it can be fixed on the
  subscription in Stripe.
- RE-only events (events whose access is "Real Estate Promo Only") still work, but
  their tier label now reads "Core" to members (a minor cosmetic side effect of making
  promo members look like Core). Tell me if you'd prefer a separate label there.
