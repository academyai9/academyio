# AcademyIO — Webinar & Seminar E-Commerce Platform

A production-ready, full-stack educational commerce platform built with **Medusa.js v2**, **Next.js 15 (App Router)**, **TypeScript**, and **PostgreSQL 16**.

Engineered specifically for selling, licensing, and delivering online educational events, professional masterclass seminars, on-demand video recordings, verbatim transcripts, and downloadable PDF study materials.

---

## Architecture Highlights

- **Backend**: Medusa.js v2 (`@medusajs/medusa` v2.18.0) with custom `webinarModuleService` module.
- **Storefront**: Next.js 15.3.9 with Server-Side Rendering (SSR), Tailwind CSS, `@medusajs/ui`, and `lucide-react`.
- **Database**: PostgreSQL 16 with custom relational entities, MikroORM migrations, and Medusa cross-module link tables (`webinarmodule_webinar_product_product`).
- **Access Control & Entitlement System**: Granular entitlement verification ensuring customers only access the specific formats they purchased (Live, Recording, Transcript, PDF, or Complete Bundle).
- **Automated Event-Driven Fulfillment**: `order.placed` subscriber automatically provisions entitlements upon verified purchase.
- **Secure File Delivery**: Unpublished live stream links, meeting passwords, and video URLs are completely redacted from public APIs and only delivered to authenticated, entitled purchasers.

---

## 23 Production Storefront Pages

1. **Home Page** (`/` or `/[countryCode]`): Hero, statistics, featured upcoming webinars, multi-format comparison, and faculty showcase.
2. **All Webinars** (`/[countryCode]/webinars`): Complete curriculum catalog with category and format filters.
3. **Upcoming Webinars** (`/[countryCode]/webinars/upcoming`): Live interactive broadcast schedule.
4. **On-Demand Webinars** (`/[countryCode]/webinars/on-demand`): Self-paced recordings with 1-year streaming access.
5. **Seminar Listings** (`/[countryCode]/seminars`): Intensive multi-hour masterclasses.
6. **Webinar Categories** (`/[countryCode]/categories`): Federal Taxation, Auditing & Accounting, Corporate Tax, Estate Planning, Emerging Tech.
7. **Webinar Details** (`/[countryCode]/webinars/[slug]`): Complete syllabus, learning objectives, speaker bio, and 5-tier purchase options selector.
8. **Search Results** (`/[countryCode]/search`): Keyword matching across titles, IRS form numbers, and speaker names.
9. **Shopping Cart** (`/[countryCode]/cart`): Medusa-powered shopping cart with line items and subtotal calculation.
10. **Checkout** (`/[countryCode]/checkout`): Secure billing details, payment provider collection, and order submission.
11. **Customer Registration** (`/[countryCode]/register`): Professional account creation with CPA/EA licensing credential fields.
12. **Customer Login** (`/[countryCode]/login`): Secure JWT authentication with one-click demo fast-fill button.
13. **Forgot Password** (`/[countryCode]/forgot-password`): Automated password recovery flow.
14. **Customer Dashboard Overview** (`/[countryCode]/dashboard`): Live metrics, recent purchases, and course launchpads.
15. **My Live Webinars** (`/[countryCode]/dashboard/webinars`): Confirmed live session registrations and secure meeting launcher.
16. **My Video Recordings** (`/[countryCode]/dashboard/recordings`): On-demand video player with playback controls.
17. **My Transcripts** (`/[countryCode]/dashboard/transcripts`): Verbatim written reader and PDF download.
18. **Conference Material** (`/[countryCode]/dashboard/downloads`): Downloadable instructor slide decks, worksheets, and audit checklists.
19. **My Orders** (`/[countryCode]/dashboard/orders`): Transaction history, payment verification, and receipts.
20. **My Profile** (`/[countryCode]/dashboard/profile`): Contact information, firm name, and credentials.
21. **About Us** (`/[countryCode]/about`): Educational mission, faculty vetting standards, and NASBA alignment.
22. **Contact Us** (`/[countryCode]/contact`): Support email, phone, and interactive inquiry form.
23. **FAQ & Policies** (`/[countryCode]/faq`, `/privacy`, `/terms`, `/refund-policy`): Comprehensive legal and operational policies.

---

## Localhost Installation & Setup

### 1. Prerequisites
- **Node.js**: v20.x or v22.x (`node -v`)
- **npm**: v10.x (`npm -v`)
- **PostgreSQL**: 16.x (`psql --version`)

### 2. Database Creation
In your terminal, connect to PostgreSQL and create the application database:
```bash
createdb academyio_medusa
# Or via psql:
# psql -U <your_user> -c "CREATE DATABASE academyio_medusa;"
```

### 3. Environment Variable Configuration
Copy the example templates (`backend/.env.template` -> `backend/.env`, `storefront/.env.template` -> `storefront/.env.local`) and fill in your own secrets (never commit `.env` files to Git):

**Backend (`backend/.env`):**
```bash
PORT=9000
DATABASE_URL=postgres://<username>:<password>@127.0.0.1:5432/academyio_medusa
STORE_CORS=http://localhost:8000,http://localhost:3000
ADMIN_CORS=http://localhost:5173,http://localhost:9000,http://localhost:8000
AUTH_CORS=http://localhost:5173,http://localhost:9000,http://localhost:8000
JWT_SECRET=<generate-with-openssl-rand-hex-32>
COOKIE_SECRET=<generate-with-openssl-rand-hex-32>
PAYMENT_ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
TURNSTILE_SECRET_KEY=<your-cloudflare-turnstile-secret-key>
MEDUSA_DISABLE_TELEMETRY=1
```

**Storefront (`storefront/.env.local`):**
```bash
MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<your-medusa-publishable-key>
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_REGION=us
REVALIDATE_SECRET=<generate-with-openssl-rand-hex-32>
```

### 4. Install Dependencies
```bash
# In backend directory:
cd backend && npm install

# In storefront directory:
cd ../storefront && npm install --legacy-peer-deps
```

### 5. Run Database Migrations
Run the Medusa core and custom webinar module migrations:
```bash
cd backend
node ./node_modules/@medusajs/cli/cli.js db:migrate
```

### 6. Seed Demo Catalog & Store Data
Execute the seed scripts to populate core store data, regions, currencies, and 6 realistic webinar programs with 30 mapped product variants:
```bash
cd backend
# 1. Seed store & catalog data:
node ./node_modules/@medusajs/cli/cli.js exec ./src/scripts/seed.ts
# 2. Seed North America (USD) region:
node ./node_modules/@medusajs/cli/cli.js exec ./src/scripts/seed-us-region.ts
# 3. Seed webinars, speakers, resources, and demo entitlements:
node ./node_modules/@medusajs/cli/cli.js exec ./src/scripts/seed-webinars.ts
```

### 7. Create Super Admin User
Create your administrative account to access the Medusa Admin portal using a strong, unique password:
```bash
cd backend
node ./node_modules/@medusajs/cli/cli.js user -e <admin-email> -p "<strong-unique-password>"
```

---

## Starting the Application Locally

You can run both services concurrently or in separate terminal windows:

### Terminal 1: Medusa.js Backend & Admin
```bash
cd backend
npm run dev
```
- **Backend API**: `http://localhost:9000`
- **Medusa Admin Portal**: `http://localhost:9000/webapp` (sign in with the administrator credentials you created in step 7)

### Terminal 2: Next.js Storefront
```bash
cd storefront
npm run start
# Or for hot-reloading development:
# npm run dev
```
- **Storefront URL**: `http://localhost:8000`

---

## Portal Endpoints

| Portal | Local URL | Access |
|---|---|---|
| **Medusa Admin** | `http://localhost:9000/webapp` | Administrator account created via CLI |
| **Customer Portal** | `http://localhost:8000/us/login` | Register a customer account via `/us/register` |

---

## Running Automated Tests

Run the comprehensive test suite verifying:
- Storefront public data redaction (zero leakage of meeting passwords or private links)
- Single webinar detail retrieval & 5-tier variant mapping
- Customer registration and secure JWT authentication
- HTTP 401 Unauthorized for unauthenticated requests
- HTTP 403 Forbidden for non-entitled customers
- Bundle entitlement verification granting all 4 access formats
- Granular single-option verification (Recording/PDF only customer receives video, but live meeting link is omitted)

```bash
cd backend
node ./node_modules/.bin/ts-node ./src/scripts/test-webinar-suite.ts
```

**Test Results:**
```
=======================================================
TEST RESULTS: 29 PASSED, 0 FAILED
=======================================================
```

---

## Project Structure

```
academyio/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── admin/           # Admin API: webinars, live-link, recordings, resources, entitlements
│   │   │   ├── store/           # Store API: public webinars, customer entitlements, secure access
│   │   │   └── middlewares.ts   # Route authentication guards
│   │   ├── links/               # Module links: webinar <> product
│   │   ├── modules/
│   │   │   └── webinar/         # Custom Webinar Module (Webinar, Resource, Entitlement, VariantMapping)
│   │   ├── scripts/             # Seeding scripts & automated test suite
│   │   └── subscribers/         # order.placed automated entitlement provisioning subscriber
│   ├── medusa-config.ts         # Medusa v2 configuration
│   └── package.json
│
├── storefront/
│   ├── src/
│   │   ├── app/[countryCode]/   # 23 Next.js 15 SSR storefront pages
│   │   ├── components/
│   │   │   ├── dashboard/       # Customer dashboard tabs & video/transcript readers
│   │   │   ├── navigation/      # Professional Navbar and Footer
│   │   │   └── webinars/        # WebinarCard, WebinarFilters, WebinarPurchaseOptions
│   │   ├── lib/data/            # Medusa SDK clients & webinar data services
│   │   └── middleware.ts        # Region routing & cookie middleware
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md          # Complete system architecture and entity diagrams
│   ├── ADMIN_GUIDE.md           # Step-by-step administration manual
│   └── DEPLOYMENT.md            # Production deployment guide (PostgreSQL, S3, Docker, Vercel)
│
├── .env.example                 # Master environment variable template
├── package.json                 # Monorepo root scripts
└── README.md                    # System documentation
```

---

## License
MIT License. Developed for AcademyIO Continuing Education Platform.
