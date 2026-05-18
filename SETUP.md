# Winner's Circle Member Portal — Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free at supabase.com)
- A Stripe account (stripe.com)

---

## Step 1: Supabase Setup

1. Go to https://supabase.com and create a new project.
2. Once the project is ready, open **SQL Editor** and paste the entire contents of `supabase/schema.sql`. Click **Run**. This creates all tables, RLS policies, triggers, and seeds the default channels.
3. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Storage** and create a new bucket called `media`. Set it to **Public**.

---

## Step 2: Stripe Setup

1. Go to https://dashboard.stripe.com and create 6 Price objects (Products → Add Product):

   | Product Name    | Price    | Billing  | Copy Price ID to env var |
   |-----------------|----------|----------|--------------------------|
   | Core Member     | $97/mo   | Monthly  | STRIPE_CORE_MONTHLY_PRICE_ID |
   | Core Member     | $970/yr  | Annual   | STRIPE_CORE_ANNUAL_PRICE_ID |
   | Elite Member    | $197/mo  | Monthly  | STRIPE_ELITE_MONTHLY_PRICE_ID |
   | Elite Member    | $1,970/yr| Annual   | STRIPE_ELITE_ANNUAL_PRICE_ID |
   | Founding Member | $497/mo  | Monthly  | STRIPE_FOUNDING_MONTHLY_PRICE_ID |
   | Founding Member | $4,970/yr| Annual   | STRIPE_FOUNDING_ANNUAL_PRICE_ID |

2. Go to **Developers → API Keys** and copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

3. For the webhook (after deployment): Go to **Developers → Webhooks → Add endpoint**
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 3: Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your keys from Steps 1 and 2.

---

## Step 4: Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the login page.

Create your first account via `/signup`, then in Supabase's Table Editor, find your profile row and change `role` to `admin` to access the admin panel.

---

## Step 5: Deploy to Railway

The project is already connected to Railway at:
https://winners-circle-portal-production.up.railway.app

To deploy the new app:
1. In the Railway dashboard, update the start command to: `npm run build && npm start`
2. Add all environment variables from `.env.local` in Railway's Variables tab
3. Push this folder to the GitHub repo (https://github.com/CineMck/winners-circle-portal) — Railway will auto-deploy

Or from the project root:
```bash
git add .
git commit -m "Add full Next.js production portal"
git push origin main
```

---

## Making Yourself an Admin

After signing up, run this in Supabase SQL Editor:

```sql
update profiles set role = 'admin', tier = 'founding' where email = 'your@email.com';
```

Then visit `/admin` for the full CRM and management panel.

---

## File Structure

```
src/
├── app/
│   ├── (portal)/          # Main portal pages (protected)
│   │   ├── home/          # Social feed
│   │   ├── community/     # Channel-based community
│   │   ├── challenges/    # Challenges with progress feeds
│   │   ├── profile/       # Member profile + settings
│   │   ├── referrals/     # Referral system
│   │   └── upgrade/       # Stripe checkout
│   ├── admin/             # Admin panel (admin/mod only)
│   │   ├── members/       # Member CRM
│   │   ├── challenges/    # Challenge management
│   │   └── channels/      # Channel management
│   ├── api/
│   │   ├── stripe/        # Checkout + portal API
│   │   └── webhooks/      # Stripe webhooks
│   ├── auth/              # Auth callback
│   ├── login/
│   └── signup/
├── components/
│   ├── feed/              # PostCard, PostComposer, CommentSection
│   ├── layout/            # PortalShell, NotificationBell
│   └── ui/                # TierBadge, Avatar
├── lib/
│   ├── supabase/          # Client, server, admin clients
│   ├── stripe/            # Stripe config
│   └── utils.ts           # Shared utilities
├── middleware.ts           # Route protection
└── types/index.ts         # All TypeScript types
supabase/
└── schema.sql             # Full DB schema + RLS + triggers
```
