# XYRO — Deployment Guide

Steps to deploy this Next.js + Prisma app to production on **Vercel** with a hosted **PostgreSQL** database.

---

## Prerequisites

- Node.js 18+
- GitHub account (for Vercel/Git integration)
- Vercel account ([vercel.com](https://vercel.com))

---

## 1. Set Up a Hosted PostgreSQL Database

### Option A: Neon (Recommended — generous free tier)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project → name it `xyro`
3. Copy the **connection string** — it looks like:
   ```
   postgresql://neondb_owner:xxxxx@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this as your `DATABASE_URL`

### Option B: Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project → go to **Settings → Database**
3. Copy the **URI** connection string
4. Save this as your `DATABASE_URL`

---

## 2. Apply the Database Schema

Run this locally with your production `DATABASE_URL`:

```bash
DATABASE_URL="your-production-url" npx prisma db push
```

Or set it in your `.env` temporarily, then run:

```bash
npx prisma db push
```

---

## 3. Generate an Auth Secret

```bash
openssl rand -hex 32
```

Copy the output — this becomes your `AUTH_SECRET`.

---

## 4. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → import your repo
3. Set these **Environment Variables** in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon/Supabase connection string |
| `AUTH_SECRET` | The 32-char hex from step 3 |
| `AUTH_URL` | `https://your-app.vercel.app` (or custom domain) |
| `NEXTAUTH_URL` | Same as `AUTH_URL` |
| `NEXT_PUBLIC_APP_NAME` | `XYRO` |
| `NEXT_PUBLIC_APP_URL` | Same as `AUTH_URL` |
| `NODE_ENV` | `production` |

### Optional (enable when ready):

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_API_KEY` | From [resend.com](https://resend.com) |
| `EMAIL_FROM` | `noreply@yourdomain.com` |
| `PAYMENT_PROVIDER` | `razorpay` |
| `PAYMENT_PROVIDER_KEY` | From Razorpay Dashboard |
| `PAYMENT_PROVIDER_SECRET` | From Razorpay Dashboard |

4. Click **Deploy** — Vercel runs `npm run build` automatically

---

## 5. Custom Domain (Optional)

1. In Vercel → Project Settings → Domains
2. Add your domain (e.g., `xyro.fitness`)
3. Update DNS records as instructed
4. Update `AUTH_URL`, `NEXTAUTH_URL`, and `NEXT_PUBLIC_APP_URL` to use your domain

---

## Quick Local Setup (Development)

```bash
# 1. Copy env
cp .env.example .env
# Edit .env with your values

# 2. Install deps
npm install

# 3. Start embedded local Postgres
npm run db:start

# 4. Apply schema + seed
npm run db:push
npm run db:seed

# 5. Run dev server
npm run dev
```

---

## Troubleshooting

- **Build fails with Prisma errors**: Make sure `DATABASE_URL` is set in Vercel env vars before deploying
- **Auth redirects to wrong URL**: Ensure `AUTH_URL` and `NEXTAUTH_URL` match your actual domain (including `https://`)
- **Google OAuth not working**: Set up OAuth consent screen + credentials at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials), add your domain as an authorized redirect URI
- **Database connection timeout**: If using Neon, ensure `?sslmode=require` is in the connection string
