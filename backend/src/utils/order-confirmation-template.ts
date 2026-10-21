export interface OrderEmailItem {
  title: string
  variantTitle?: string | null
  optionType?: string | null
  speakerName?: string | null
  cpeCredits?: number | null
  eventDate?: string | null
  eventTime?: string | null
  timezone?: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  currency: string
}

export interface OrderConfirmationEmailData {
  orderId: string
  displayId: string
  orderDateFormatted: string
  customerName: string
  customerEmail: string
  items: OrderEmailItem[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  currency: string
  paymentMethod: string
  paymentStatus: "PAID" | "AUTHORIZED" | "PENDING"
  isPaid: boolean
  frontendUrl: string
  supportEmail: string
}

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function generateOrderConfirmationEmail(data: OrderConfirmationEmailData): {
  subject: string
  html: string
  text: string
} {
  const currencyCode = (data.currency || "USD").toUpperCase()
  const displayId = data.displayId || data.orderId.slice(-8).toUpperCase()
  const viewOrderUrl = `${data.frontendUrl}/us/dashboard?tab=orders`
  const supportEmail = data.supportEmail || "support@academyio.com"

  const subject = data.isPaid
    ? `Order Confirmed: #INV-${displayId} - AcademyIO`
    : `Order Received: #INV-${displayId} - AcademyIO`

  // Format delivery / access instructions based on items
  const hasLive = data.items.some((i) => (i.optionType || i.variantTitle || "").toLowerCase().includes("live"))
  const hasRecording = data.items.some((i) =>
    (i.optionType || i.variantTitle || "").toLowerCase().includes("recording") ||
    (i.optionType || i.variantTitle || "").toLowerCase().includes("on-demand") ||
    (i.optionType || i.variantTitle || "").toLowerCase().includes("self-study")
  )
  const hasTranscript = data.items.some((i) =>
    (i.optionType || i.variantTitle || "").toLowerCase().includes("transcript") ||
    (i.optionType || i.variantTitle || "").toLowerCase().includes("download")
  )

  // --------------------------------------------------------------------------
  // 1. HTML TEMPLATE (Responsive, table-based, inline CSS for Gmail & Outlook)
  // --------------------------------------------------------------------------
  const itemRowsHtml = data.items
    .map((item, idx) => {
      const optionLabel = item.optionType
        ? item.optionType.toUpperCase()
        : item.variantTitle || "All-Access License"

      const scheduleDetails =
        item.eventDate || item.eventTime
          ? `${item.eventDate || ""}${item.eventTime ? ` • ${item.eventTime}` : ""}${
              item.timezone ? ` ${item.timezone}` : ""
            }`
          : null

      const metadataPills = [
        item.speakerName ? `Faculty: ${item.speakerName}` : null,
        item.cpeCredits ? `${Number(item.cpeCredits).toFixed(1)} CPE Credits` : null,
      ]
        .filter(Boolean)
        .join(" | ")

      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc"

      return `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 16px 20px; vertical-align: top;">
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.4; margin-bottom: 4px;">
              ${escapeHtml(item.title)}
            </div>
            <div style="font-size: 12px; color: #1e4794; font-weight: 600; margin-bottom: 4px;">
              Package: <span style="background-color: #eff6ff; padding: 2px 8px; border-radius: 4px; border: 1px solid #dbeafe;">${escapeHtml(optionLabel)}</span>
            </div>
            ${
              scheduleDetails
                ? `<div style="font-size: 12px; color: #0369a1; margin-bottom: 4px;">
                    📅 <strong>Scheduled Date:</strong> ${escapeHtml(scheduleDetails)}
                   </div>`
                : ""
            }
            ${
              metadataPills
                ? `<div style="font-size: 11px; color: #64748b;">
                    ${escapeHtml(metadataPills)}
                   </div>`
                : ""
            }
          </td>
          <td style="padding: 16px 12px; vertical-align: top; text-align: center; font-size: 13px; color: #334155;">
            ${item.quantity || 1}
          </td>
          <td style="padding: 16px 20px; vertical-align: top; text-align: right; font-size: 14px; font-weight: 700; color: #0f172a;">
            $${Number(item.totalPrice).toFixed(2)}
          </td>
        </tr>
      `
    })
    .join("")

  const paymentBadgeHtml = data.isPaid
    ? `
      <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 6px 12px;">
        <span style="font-size: 12px; font-weight: 700; color: #065f46;">✔ PAID & CONFIRMED</span>
      </div>
      <div style="font-size: 12px; color: #047857; margin-top: 4px;">
        Payment authorized and captured via ${escapeHtml(data.paymentMethod)}.
      </div>
    `
    : `
      <div style="display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 12px;">
        <span style="font-size: 12px; font-weight: 700; color: #1e40af;">⏳ ORDER RECEIVED (Pending Settlement)</span>
      </div>
      <div style="font-size: 12px; color: #1d4ed8; margin-top: 4px;">
        Payment authorized via ${escapeHtml(data.paymentMethod)}; awaiting settlement confirmation.
      </div>
    `

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    table { border-collapse: collapse; }
    a { color: #1e4794; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container-table { width: 100% !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <center>
    <table role="presentation" class="container-table" width="600" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; text-align: left;">
      
      <!-- TOP ACCENT BAR -->
      <tr>
        <td height="6" style="background-color: #1e4794; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
      </tr>

      <!-- BRAND HEADER -->
      <tr>
        <td style="padding: 28px 32px 20px 32px; background-color: #0f1f47; color: #ffffff;">
          <table role="presentation" width="100%">
            <tr>
              <td>
                <div style="margin-bottom: 4px;">
                  <img src="${data.frontendUrl}/logos/academyio-logo-white.png" alt="AcademyIO" width="180" style="display: block; border: 0; max-height: 42px; width: auto; max-width: 190px;" />
                </div>
                <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">
                  Continuing Professional Education & Technical Training
                </div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <span style="font-size: 10px; color: #cbd5e1; background-color: rgba(255,255,255,0.12); padding: 4px 8px; border-radius: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Official Receipt
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- HERO BANNER -->
      <tr>
        <td style="padding: 32px 32px 16px 32px;">
          <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #0f172a;">
            Thank You for Your Order!
          </h1>
          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
            Hello <strong>${escapeHtml(data.customerName || "Valued Professional")}</strong>, your order has been successfully recorded. Below are your official order details, registered courses, and fulfillment access instructions.
          </p>
        </td>
      </tr>

      <!-- ORDER & PAYMENT OVERVIEW BOX -->
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                <table role="presentation" width="100%">
                  <tr>
                    <td class="mobile-stack" style="vertical-align: top;">
                      <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Order Number</div>
                      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">#INV-${escapeHtml(displayId)}</div>
                    </td>
                    <td class="mobile-stack" style="vertical-align: top; text-align: right;">
                      <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Order Date & Time</div>
                      <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">${escapeHtml(data.orderDateFormatted)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px;">Payment Status</div>
                ${paymentBadgeHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ORDER ITEMS TABLE -->
      <tr>
        <td style="padding: 0 32px 16px 32px;">
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">
            Enrolled Webinars & Course Materials
          </div>
          <table role="presentation" width="100%" style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #0f1f47; color: #ffffff;">
                <th style="padding: 10px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Course Description</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Qty</th>
                <th style="padding: 10px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Tuition</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml}
            </tbody>
          </table>
        </td>
      </tr>

      <!-- TOTALS BREAKDOWN -->
      <tr>
        <td style="padding: 0 32px 28px 32px;">
          <table role="presentation" width="100%">
            <tr>
              <td width="50%">&nbsp;</td>
              <td width="50%">
                <table role="presentation" width="100%" style="font-size: 13px;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
                    <td style="padding: 4px 0; text-align: right; color: #0f172a; font-weight: 600;">$${Number(data.subtotal || data.total).toFixed(2)}</td>
                  </tr>
                  ${
                    data.discountTotal > 0
                      ? `<tr>
                          <td style="padding: 4px 0; color: #059669;">Discounts Applied:</td>
                          <td style="padding: 4px 0; text-align: right; color: #059669; font-weight: 600;">-$${Number(data.discountTotal).toFixed(2)}</td>
                         </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">Tax (Exempt Educational Services):</td>
                    <td style="padding: 4px 0; text-align: right; color: #64748b;">$0.00</td>
                  </tr>
                  <tr style="border-top: 2px solid #e2e8f0;">
                    <td style="padding: 10px 0 4px 0; font-size: 15px; font-weight: 800; color: #0f172a;">Total:</td>
                    <td style="padding: 10px 0 4px 0; font-size: 16px; font-weight: 800; color: #1e4794; text-align: right;">
                      $${Number(data.total).toFixed(2)} ${escapeHtml(currencyCode)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- DELIVERY & ACCESS SCHEDULE NOTICE -->
      <tr>
        <td style="padding: 0 32px 28px 32px;">
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 20px;">
            <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 8px;">
              📦 Delivery & Access Schedule
            </div>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #15803d; line-height: 1.6;">
              ${
                hasLive
                  ? `<li><strong>Live Webinars:</strong> Interactive live stream links and calendar invites are dispatched to your email 24 hours prior to the live broadcast and accessible in your customer dashboard under "Live Sessions".</li>`
                  : ""
              }
              ${
                hasRecording
                  ? `<li><strong>On-Demand Recordings:</strong> Video recordings and downloadable handouts are uploaded to your customer dashboard within 2 to 4 hours following live session completion.</li>`
                  : ""
              }
              ${
                hasTranscript
                  ? `<li><strong>Transcripts & Downloads:</strong> Verbatim reference transcripts and course materials are downloadable immediately in your customer dashboard under "Transcripts & Materials".</li>`
                  : ""
              }
              <li><strong>CPE Certificates:</strong> Official certificates of completion are issued immediately after completing course requirements and attendance verification.</li>
            </ul>
          </div>
        </td>
      </tr>

      <!-- CTA BUTTON -->
      <tr>
        <td style="padding: 0 32px 32px 32px; text-align: center;">
          <a href="${viewOrderUrl}" target="_blank" style="display: inline-block; background-color: #1e4794; color: #ffffff; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(30, 71, 148, 0.2);">
            View My Order & Access Dashboard →
          </a>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">
            Direct link: <a href="${viewOrderUrl}" style="color: #64748b; text-decoration: underline;">${viewOrderUrl}</a>
          </div>
        </td>
      </tr>

      <!-- SUPPORT & ACCREDITATION FOOTER -->
      <tr>
        <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.6;">
          <table role="presentation" width="100%">
            <tr>
              <td>
                <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">Need Assistance?</div>
                <div>Our dedicated customer care team is here to assist you:</div>
                <div>Support Email: <a href="mailto:${supportEmail}" style="color: #1e4794; font-weight: 600;">${supportEmail}</a></div>
                <div>Accreditation: NASBA QAS Registry Sponsor ID #142859 | IRS Approved CE Provider</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 14px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; margin-top: 12px;">
                © 2026 AcademyIO LLC. 131 Continental Dr, Suite 305, Newark, DE 19713. All rights reserved.<br>
                This transactional email was sent regarding order #INV-${escapeHtml(displayId)}.
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>
  `

  // --------------------------------------------------------------------------
  // 2. PLAIN TEXT VERSION (Clean fallback for text-only clients)
  // --------------------------------------------------------------------------
  const itemRowsText = data.items
    .map((item, idx) => {
      const optionLabel = item.optionType
        ? item.optionType.toUpperCase()
        : item.variantTitle || "All-Access License"

      const scheduleDetails =
        item.eventDate || item.eventTime
          ? `\n   Scheduled Date: ${item.eventDate || ""}${
              item.eventTime ? ` • ${item.eventTime}` : ""
            }${item.timezone ? ` ${item.timezone}` : ""}`
          : ""

      const metadata = [
        item.speakerName ? `Faculty: ${item.speakerName}` : null,
        item.cpeCredits ? `${Number(item.cpeCredits).toFixed(1)} CPE Credits` : null,
      ]
        .filter(Boolean)
        .join(" | ")

      return `${idx + 1}. ${item.title}
   Package: ${optionLabel}${scheduleDetails}
   ${metadata ? `${metadata}\n   ` : ""}Qty: ${item.quantity || 1} | Price: $${Number(item.totalPrice).toFixed(2)}`
    })
    .join("\n\n")

  const text = `================================================================================
ACADEMYIO - ORDER CONFIRMATION & RECEIPT
================================================================================

Thank You for Your Order!

Hello ${data.customerName || "Valued Professional"},

Your order has been successfully recorded. Below are your official order details, registered courses, and fulfillment access instructions.

--------------------------------------------------------------------------------
ORDER SUMMARY
--------------------------------------------------------------------------------
Order Number    : #INV-${displayId}
Order Date/Time : ${data.orderDateFormatted}
Payment Status  : ${data.isPaid ? "PAID & CONFIRMED" : "ORDER RECEIVED (Pending Settlement)"}
Payment Method  : ${data.paymentMethod}

--------------------------------------------------------------------------------
PURCHASED COURSES & WEBINARS
--------------------------------------------------------------------------------
${itemRowsText}

--------------------------------------------------------------------------------
FINANCIAL BREAKDOWN
--------------------------------------------------------------------------------
Subtotal        : $${Number(data.subtotal || data.total).toFixed(2)}
${data.discountTotal > 0 ? `Discounts       : -$${Number(data.discountTotal).toFixed(2)}\n` : ""}Tax (Exempt)    : $0.00
Total Paid      : $${Number(data.total).toFixed(2)} ${currencyCode}

--------------------------------------------------------------------------------
DELIVERY & ACCESS SCHEDULE
--------------------------------------------------------------------------------
- Live Webinars: Access links and calendar invites are sent 24 hours prior to the live broadcast and accessible in your customer dashboard under "Live Sessions".
- On-Demand Recordings: Uploaded to your dashboard within 2-4 hours after session completion.
- Transcripts & Materials: Available immediately in your customer dashboard.
- CPE Certificates: Issued immediately upon completing verification requirements.

--------------------------------------------------------------------------------
ACCESS YOUR ORDER & DASHBOARD
--------------------------------------------------------------------------------
View your order details and access purchased webinars online:
${viewOrderUrl}

--------------------------------------------------------------------------------
SUPPORT & CONTACT
--------------------------------------------------------------------------------
Customer Support : ${supportEmail}
Accreditation    : NASBA QAS Registry Sponsor ID #142859 | IRS Approved CE Provider

AcademyIO LLC
131 Continental Dr, Suite 305, Newark, DE 19713
© 2026 AcademyIO LLC. All rights reserved.
`

  return {
    subject,
    html,
    text,
  }
}
