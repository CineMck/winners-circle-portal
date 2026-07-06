#!/usr/bin/env node
/**
 * One-shot setup for the Winners Circle "Base" plan in Stripe.
 *
 * Creates:
 *   1. Product  — "Winners Circle Base Membership"
 *   2. Price    — $50.00/mo  (list/anchor price, lookup_key wc_base_monthly_50)
 *   3. Price    — $19.95/mo  (promo price members actually buy, with a free
 *                 30-day trial applied by the checkout route;
 *                 lookup_key wc_base_promo_1995)
 *
 * Idempotent: re-running reuses the existing product (by name) and prices
 * (by lookup_key) instead of creating duplicates.
 *
 * Usage (run in TEST mode first, then LIVE):
 *   cd winners-circle-portal-app
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-base-plan.mjs
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/create-base-plan.mjs
 *
 * Then copy the printed env vars into Railway (portal service) and redeploy.
 */

import Stripe from 'stripe';

const PRODUCT_NAME = 'Winners Circle Base Membership';
const LIST_LOOKUP = 'wc_base_monthly_50';
const PROMO_LOOKUP = 'wc_base_promo_1995';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('❌  Set STRIPE_SECRET_KEY, e.g.:');
  console.error('    STRIPE_SECRET_KEY=sk_test_... node scripts/create-base-plan.mjs');
  process.exit(1);
}

const mode = key.startsWith('sk_live') ? 'LIVE' : 'TEST';
const stripe = new Stripe(key);

console.log(`\n🔑  Running against Stripe in ${mode} mode\n`);

// ── 1. Product (reuse if it already exists) ──────────────────────────────
let product;
const existingProducts = await stripe.products.list({ active: true, limit: 100 });
product = existingProducts.data.find(p => p.name === PRODUCT_NAME);
if (product) {
  console.log(`♻️   Reusing existing product: ${product.id}`);
} else {
  product = await stripe.products.create({
    name: PRODUCT_NAME,
    description:
      'Base membership — 1 live Zoom call per month with John, free resources library, and Winners Circle app access. $50/mo list price, launched at $19.95/mo with a free 30-day trial.',
  });
  console.log(`✅  Created product: ${product.id}`);
}

// ── 2. Prices (reuse by lookup_key) ──────────────────────────────────────
async function ensurePrice({ lookupKey, unitAmount, nickname }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) {
    console.log(`♻️   Reusing existing price ${nickname}: ${existing.data[0].id}`);
    return existing.data[0];
  }
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname,
    lookup_key: lookupKey,
  });
  console.log(`✅  Created price ${nickname}: ${price.id}`);
  return price;
}

const listPrice = await ensurePrice({
  lookupKey: LIST_LOOKUP,
  unitAmount: 5000,
  nickname: 'Base — $50/mo list',
});

const promoPrice = await ensurePrice({
  lookupKey: PROMO_LOOKUP,
  unitAmount: 1995,
  nickname: 'Base — $19.95/mo promo (free 30-day trial)',
});

// ── 3. Print env vars ────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────────────────────');
console.log(`Add these to Railway (${mode} mode) and redeploy:\n`);
console.log(`NEXT_PUBLIC_STRIPE_BASE_PROMO_PRICE_ID=${promoPrice.id}`);
console.log(`NEXT_PUBLIC_STRIPE_BASE_MONTHLY_PRICE_ID=${listPrice.id}`);
console.log('──────────────────────────────────────────────────────────\n');
console.log('Notes:');
console.log('• The app sells the PROMO price ($19.95/mo). The checkout route');
console.log('  automatically adds the free 30-day trial for that price.');
console.log('• The $50 list price is the anchor (shown crossed out) and is');
console.log('  mapped to the base tier in the webhook for when the promo ends.');
console.log('• Also run supabase/base_tier.sql in the Supabase SQL editor');
console.log('  BEFORE deploying, or tier updates to "base" will fail.\n');
