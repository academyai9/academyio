# Production Deployment Guide: AcademyIO Webinar Platform

This guide outlines production provisioning, database hosting, cloud asset storage, Stripe payment processing, and containerized deployment.

---

## 1. Production Architecture Overview

```
[Browser / End Users]
         │
         ▼
[Cloudflare CDN / SSL]
   ├───► [Next.js Storefront (Vercel / Node.js)] (:8000 / port 443)
   └───► [Medusa.js v2 Backend (Railway / Render / AWS)] (:9000 / port 443)
               │
               ├──► [Managed PostgreSQL 16 (AWS RDS / Supabase / Neon)]
               ├──► [Managed Redis 7 (Upstash / Redis Cloud)]
               ├──► [S3 / Cloudflare R2 Private Bucket (Protected PDFs)]
               └──► [Stripe API & Webhooks]
```

---

## 2. Infrastructure Requirements

1. **Node.js**: v20.x or v22.x LTS
2. **PostgreSQL**: 16.x with SSL enabled (`sslmode=require`)
3. **Redis**: v7.x for Medusa distributed cache and BullMQ event queues
4. **Object Storage**: AWS S3 or Cloudflare R2 bucket for instructor slides and transcripts

---

## 3. Database & Backend Deployment (Docker / Railway / Render)

### A. Environment Configuration (`backend/.env`)
```bash
NODE_ENV=production
PORT=9000

# High-Availability Database
DATABASE_URL=postgres://user:password@prod-postgres-host:5432/academyio_medusa?sslmode=require

# Redis Queue & Event Bus
REDIS_URL=rediss://default:password@prod-redis-host:6379

# Cryptographic Keys (Generate unique values with `openssl rand -hex 32`)
JWT_SECRET=<GENERATE_WITH_OPENSSL_RAND_HEX_32>
COOKIE_SECRET=<GENERATE_WITH_OPENSSL_RAND_HEX_32>
PAYMENT_ENCRYPTION_KEY=<GENERATE_WITH_OPENSSL_RAND_HEX_32>

# Production CORS (Set to your actual domains)
STORE_CORS=https://academyio.com,https://www.academyio.com
ADMIN_CORS=https://admin.academyio.com
AUTH_CORS=https://academyio.com,https://admin.academyio.com

# Stripe Integration
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### B. Production Build & Migration Commands
```bash
# In backend directory:
npm ci --omit=dev
node ./node_modules/@medusajs/cli/cli.js db:migrate
node ./node_modules/@medusajs/cli/cli.js build
node ./node_modules/@medusajs/cli/cli.js start
```

---

## 4. Storefront Deployment (Vercel / Node.js)

### A. Environment Variables (`storefront/.env.production`)
```bash
MEDUSA_BACKEND_URL=https://api.academyio.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.academyio.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_BASE_URL=https://academyio.com
NEXT_PUBLIC_DEFAULT_REGION=us
REVALIDATE_SECRET=<GENERATE_WITH_OPENSSL_RAND_HEX_32>
```

### B. Vercel Deployment
Deploy `storefront` directly via Vercel CLI or GitHub Integration:
```bash
cd storefront
vercel --prod
```

---

## 5. Stripe Payment Provider Configuration

1. In Medusa Admin (`/app/settings`), configure the Stripe payment provider under your payment collections.
2. In the Stripe Dashboard, create a webhook endpoint pointing to:
   `https://api.academyio.com/hooks/payment/stripe`
3. Subscribe to the following events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the Webhook Signing Secret into `STRIPE_WEBHOOK_SECRET`.

---

## 6. Secure Private File Storage (S3 / Cloudflare R2)

In production, avoid local filesystem storage for PDF resources and transcripts. Install the S3 storage plugin or configure signed URL generation:
```bash
npm install @medusajs/file-s3
```
Configure your private S3 bucket in `medusa-config.ts` so files are served via short-lived, authenticated presigned URLs.
