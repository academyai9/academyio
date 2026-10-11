# Administrator Operations Manual: AcademyIO Webinar Platform

This manual details administration procedures for managing webinars, speakers, purchase variants, private joining links, recordings, files, and customer entitlements.

---

## 1. Accessing the Admin Interface

- **Admin URL**: `http://localhost:9000/app`
- **Default Super Admin Credentials**:
  - **Email**: `admin@academyio.com`
  - **Password**: `SuperAdmin2026!`

The Medusa Admin dashboard provides comprehensive visibility into products, orders, customers, pricing, sales channels, and API keys.

---

## 2. Managing Webinars & Events

### A. Creating a Webinar
To create a new webinar via the Admin API:
```bash
curl -X POST http://localhost:9000/admin/webinars \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "title": "Corporate Alternative Minimum Tax (CAMT) Deep Dive",
    "speaker_name": "Dr. Amanda Chen, Ph.D., CPA",
    "speaker_title": "Professor & Tax Accounting Consultant",
    "event_date": "2026-11-24T14:00:00-05:00",
    "start_time": "2:00 PM EST",
    "end_time": "3:40 PM EST",
    "timezone": "America/New_York",
    "duration_minutes": 100,
    "category": "Corporate Tax",
    "cpe_credits": 2,
    "short_description": "Analyzing applicable corporation threshold rules and financial statement income adjustments under Section 55.",
    "status": "published",
    "is_upcoming": true
  }'
```

When a webinar is created via this endpoint, the system automatically:
1. Generates an SEO-optimized slug (e.g. `corporate-alternative-minimum-tax-camt-deep-dive`).
2. Creates the associated Medusa Product in the catalog.
3. Automatically sets up the 5 standard purchasable variants:
   - Live Webinar Access
   - Recorded Webinar
   - Webinar Transcript
   - PDF Download
   - Complete Package (All Included)
4. Configures `WebinarVariantMapping` linking each SKU to its entitlement permissions.

---

## 3. Managing Live Session Links

The live joining link (Zoom, Teams, Webex) must never be published prematurely or exposed to unauthorized visitors.

### A. Setting or Updating a Live Link
```bash
curl -X POST http://localhost:9000/admin/webinars/<WEBINAR_ID>/live-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "live_stream_url": "https://zoom.us/j/98421038592?pwd=SecureMeetingPasscode",
    "live_instructions": "Please join 10 minutes prior to broadcast. Ensure your Zoom display name matches your registration name for CPE attendance tracking.",
    "live_link_published": true
  }'
```

- When `live_link_published` is `false`, the customer dashboard displays: *"Pending Publication: The organizer will publish the joining link prior to broadcast."*
- When `live_link_published` is `true`, customers holding valid Live or Bundle entitlements instantly see the active meeting launcher.

---

## 4. Managing Recordings & Transcripts

### A. Publishing On-Demand Video Recordings
```bash
curl -X POST http://localhost:9000/admin/webinars/<WEBINAR_ID>/recording \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "recording_url": "https://customer-assets.academyio.com/recordings/camt-2026-session.mp4",
    "recording_instructions": "High definition stream with full navigation controls.",
    "recording_expires_at": "2027-11-24T23:59:59-05:00"
  }'
```

### B. Attaching Transcripts and PDF Resources
```bash
curl -X POST http://localhost:9000/admin/webinars/<WEBINAR_ID>/resources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "title": "Corporate AMT Calculation Matrix & Worksheets",
    "description": "Step-by-step AFSI adjustment schedules.",
    "file_url": "https://customer-assets.academyio.com/resources/camt_calculation_matrix.pdf",
    "file_name": "camt_calculation_matrix.pdf",
    "file_size": 3100000,
    "access_type": "pdf",
    "is_published": true
  }'
```

---

## 5. Customer Entitlement Management & Audit Trail

Administrators can inspect, manually grant, or revoke customer access with auditable logs.

### A. Reviewing Entitlements
```bash
curl -s "http://localhost:9000/admin/entitlements?customer_email=customer@academyio.com" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### B. Manually Granting an Entitlement
Used for phone orders, corporate firm partnerships, or complimentary staff passes:
```bash
curl -X POST http://localhost:9000/admin/entitlements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "customer_id": "cus_01M4N9E77VCVQ630H7XRT1441K",
    "customer_email": "customer@academyio.com",
    "webinar_id": "web__01M4N9A6PR3V7ZJF6P58BD2M8B",
    "access_type": "bundle",
    "notes": "Complimentary firm-wide partner registration approved by management"
  }'
```

### C. Revoking Access (Refunds / Cancellations)
```bash
curl -X POST http://localhost:9000/admin/entitlements/<ENTITLEMENT_ID>/revoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "reason": "Customer requested full refund due to schedule conflict"
  }'
```
Revoked entitlements immediately block the customer from viewing live stream URLs, video streams, and downloading PDFs.
