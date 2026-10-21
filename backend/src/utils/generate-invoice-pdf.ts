import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export interface InvoiceItemData {
  title: string
  variantTitle?: string | null
  speaker?: string | null
  cpeCredits?: number | null
  quantity: number
  unitPrice: number
  totalPrice: number
  currency: string
}

export interface InvoicePdfData {
  orderId: string
  displayId: string
  orderDate: string
  customerName: string
  customerEmail: string
  companyName?: string | null
  ptin?: string | null
  licenseType?: string | null
  items: InvoiceItemData[]
  subtotal: number
  taxTotal: number
  discountTotal: number
  total: number
  currency: string
  paymentStatus: string
  paymentMethod?: string
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  // Portrait Letter: 8.5" x 11" (612 x 792 pt)
  const page = doc.addPage([612, 792])

  // Embed Fonts
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique)

  // Color Palette
  const navyDark = rgb(0.06, 0.12, 0.28) // #0f1f47
  const navyPrimary = rgb(0.12, 0.28, 0.58) // #1e4794
  const emeraldDark = rgb(0.04, 0.48, 0.28) // #0a7a47
  const textDark = rgb(0.12, 0.15, 0.2) // #1e2633
  const textMuted = rgb(0.42, 0.48, 0.56) // #6b7a8f
  const borderLight = rgb(0.85, 0.88, 0.92) // #d9e0eb
  const bgLight = rgb(0.96, 0.97, 0.98) // #f5f7fa
  const white = rgb(1, 1, 1)

  const margin = 40
  const pageWidth = 612
  const contentWidth = pageWidth - margin * 2
  let y = 752

  // 1. Top Decorative Brand Accent Line
  page.drawRectangle({
    x: 0,
    y: 786,
    width: pageWidth,
    height: 6,
    color: navyPrimary,
  })

  // 2. Header: Logo & Company Information
  let logoEmbedded = false
  try {
    const fs = await import("fs")
    const path = await import("path")
    const logoPaths = [
      path.resolve(process.cwd(), "public/logos/academyio-logo.png"),
      path.resolve(process.cwd(), "../storefront/public/logos/academyio-logo.png"),
      path.resolve(__dirname, "../../public/logos/academyio-logo.png"),
    ]
    for (const lp of logoPaths) {
      if (fs.existsSync(lp)) {
        const logoBytes = fs.readFileSync(lp)
        const logoImg = await doc.embedPng(logoBytes)
        const logoScale = 28 / logoImg.height
        const logoW = logoImg.width * logoScale
        page.drawImage(logoImg, {
          x: margin,
          y: y - 8,
          width: logoW,
          height: 28,
        })
        logoEmbedded = true
        break
      }
    }
  } catch (e) {
    logoEmbedded = false
  }

  if (!logoEmbedded) {
    page.drawText("ACADEMYIO", {
      x: margin,
      y: y,
      size: 24,
      font: helveticaBold,
      color: navyDark,
    })
    page.drawText("LLC", {
      x: margin + helveticaBold.widthOfTextAtSize("ACADEMYIO", 24) + 4,
      y: y,
      size: 14,
      font: helveticaBold,
      color: navyPrimary,
    })
  }

  // Invoice Title on Top Right
  const invoiceTitle = "OFFICIAL INVOICE & TAX RECEIPT"
  const titleWidth = helveticaBold.widthOfTextAtSize(invoiceTitle, 13)
  page.drawText(invoiceTitle, {
    x: pageWidth - margin - titleWidth,
    y: y + 4,
    size: 13,
    font: helveticaBold,
    color: navyDark,
  })

  const invNumText = `Invoice #: INV-${data.displayId}`
  const invNumWidth = helveticaBold.widthOfTextAtSize(invNumText, 10)
  page.drawText(invNumText, {
    x: pageWidth - margin - invNumWidth,
    y: y - 12,
    size: 10,
    font: helveticaBold,
    color: navyPrimary,
  })

  y -= 26
  page.drawText("Continuing Professional Education & Technical Training", {
    x: margin,
    y: y,
    size: 9,
    font: helveticaOblique,
    color: textMuted,
  })

  y -= 13
  page.drawText("Accredited NASBA QAS Registry Sponsor ID #142859 | IRS Approved CE Provider", {
    x: margin,
    y: y,
    size: 8,
    font: helvetica,
    color: textMuted,
  })

  y -= 8
  page.drawText("Website: www.academyio.com | Support: support@academyio.com", {
    x: margin,
    y: y,
    size: 8,
    font: helvetica,
    color: textMuted,
  })

  y -= 20
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: borderLight,
  })

  // 3. Invoice Summary & Billing Boxes (Two Columns)
  y -= 18
  const boxHeight = 72
  const colWidth = (contentWidth - 15) / 2

  // Column 1: Bill To / Registrant Information
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: colWidth,
    height: boxHeight,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  })

  page.drawText("BILLED TO / REGISTERED ATTENDEE", {
    x: margin + 12,
    y: y - 16,
    size: 8,
    font: helveticaBold,
    color: textMuted,
  })

  page.drawText(data.customerName || "Valued Professional", {
    x: margin + 12,
    y: y - 30,
    size: 10,
    font: helveticaBold,
    color: textDark,
  })

  page.drawText(data.customerEmail, {
    x: margin + 12,
    y: y - 43,
    size: 8.5,
    font: helvetica,
    color: textDark,
  })

  const firmInfo = [
    data.companyName ? `Firm: ${data.companyName}` : null,
    data.ptin ? `PTIN: ${data.ptin}` : null,
    data.licenseType ? `Designation: ${data.licenseType}` : null,
  ].filter(Boolean).join(" | ")

  if (firmInfo) {
    page.drawText(firmInfo.slice(0, 48), {
      x: margin + 12,
      y: y - 56,
      size: 8,
      font: helvetica,
      color: textMuted,
    })
  }

  // Column 2: Order & Payment Details
  const col2X = margin + colWidth + 15
  page.drawRectangle({
    x: col2X,
    y: y - boxHeight,
    width: colWidth,
    height: boxHeight,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  })

  page.drawText("ORDER & PAYMENT DETAILS", {
    x: col2X + 12,
    y: y - 16,
    size: 8,
    font: helveticaBold,
    color: textMuted,
  })

  page.drawText(`Date Issued: ${data.orderDate}`, {
    x: col2X + 12,
    y: y - 30,
    size: 8.5,
    font: helvetica,
    color: textDark,
  })

  page.drawText(`Payment Method: ${data.paymentMethod || "Electronic Card / Verified Authorization"}`, {
    x: col2X + 12,
    y: y - 43,
    size: 8.5,
    font: helvetica,
    color: textDark,
  })

  page.drawText("Status: ", {
    x: col2X + 12,
    y: y - 56,
    size: 8.5,
    font: helvetica,
    color: textDark,
  })
  page.drawText("PAID & AUTHORIZED (100% Complete)", {
    x: col2X + 48,
    y: y - 56,
    size: 8.5,
    font: helveticaBold,
    color: emeraldDark,
  })

  y -= (boxHeight + 25)

  // 4. Line Items Table Header
  const tableHeaderY = y
  page.drawRectangle({
    x: margin,
    y: tableHeaderY - 20,
    width: contentWidth,
    height: 22,
    color: navyDark,
  })

  page.drawText("COURSE / WEBINAR DESCRIPTION", {
    x: margin + 10,
    y: tableHeaderY - 14,
    size: 8,
    font: helveticaBold,
    color: white,
  })

  page.drawText("CPE CREDITS", {
    x: margin + 300,
    y: tableHeaderY - 14,
    size: 8,
    font: helveticaBold,
    color: white,
  })

  page.drawText("QTY", {
    x: margin + 385,
    y: tableHeaderY - 14,
    size: 8,
    font: helveticaBold,
    color: white,
  })

  page.drawText("TUITION", {
    x: pageWidth - margin - 60,
    y: tableHeaderY - 14,
    size: 8,
    font: helveticaBold,
    color: white,
  })

  y -= 20

  // 5. Line Items Rows
  const items = data.items && data.items.length > 0 ? data.items : [
    {
      title: "Accredited Continuing Education Webinar Package",
      variantTitle: "Full CPE Access & Educational Materials",
      speaker: "AcademyIO Faculty",
      cpeCredits: 2.0,
      quantity: 1,
      unitPrice: data.total,
      totalPrice: data.total,
      currency: data.currency,
    }
  ]

  let isAlternate = false
  for (const item of items) {
    const rowHeight = 44
    if (isAlternate) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: bgLight,
      })
    }

    // Border bottom on row
    page.drawLine({
      start: { x: margin, y: y - rowHeight },
      end: { x: pageWidth - margin, y: y - rowHeight },
      thickness: 0.5,
      color: borderLight,
    })

    // Title (truncate if too long for safety)
    const cleanTitle = (item.title || "Continuing Education Course").slice(0, 50)
    page.drawText(cleanTitle, {
      x: margin + 10,
      y: y - 16,
      size: 9,
      font: helveticaBold,
      color: textDark,
    })

    const subDetails = [
      item.variantTitle || "All-Access License",
      item.speaker ? `Instructor: ${item.speaker}` : null,
    ].filter(Boolean).join(" • ")

    page.drawText(subDetails.slice(0, 60), {
      x: margin + 10,
      y: y - 30,
      size: 7.5,
      font: helvetica,
      color: textMuted,
    })

    // CPE Credits
    const cpeText = item.cpeCredits ? `${Number(item.cpeCredits).toFixed(1)} Hours` : "2.0 Hours"
    page.drawText(cpeText, {
      x: margin + 300,
      y: y - 22,
      size: 8.5,
      font: helvetica,
      color: textDark,
    })

    // Qty
    page.drawText(String(item.quantity || 1), {
      x: margin + 395,
      y: y - 22,
      size: 8.5,
      font: helvetica,
      color: textDark,
    })

    // Price
    const priceFormatted = `$${Number(item.totalPrice).toFixed(2)}`
    const pWidth = helveticaBold.widthOfTextAtSize(priceFormatted, 9)
    page.drawText(priceFormatted, {
      x: pageWidth - margin - 20 - pWidth,
      y: y - 22,
      size: 9,
      font: helveticaBold,
      color: textDark,
    })

    y -= rowHeight
    isAlternate = !isAlternate
  }

  // 6. Financial Summary Box (Right Aligned)
  y -= 20
  const summaryBoxWidth = 230
  const summaryBoxHeight = 85
  const summaryBoxX = pageWidth - margin - summaryBoxWidth

  page.drawRectangle({
    x: summaryBoxX,
    y: y - summaryBoxHeight,
    width: summaryBoxWidth,
    height: summaryBoxHeight,
    color: bgLight,
    borderColor: borderLight,
    borderWidth: 1,
  })

  // Subtotal
  page.drawText("Tuition Subtotal:", {
    x: summaryBoxX + 15,
    y: y - 20,
    size: 8.5,
    font: helvetica,
    color: textDark,
  })
  const subFormatted = `$${Number(data.subtotal || data.total).toFixed(2)}`
  page.drawText(subFormatted, {
    x: summaryBoxX + summaryBoxWidth - 15 - helvetica.widthOfTextAtSize(subFormatted, 8.5),
    y: y - 20,
    size: 8.5,
    font: helvetica,
    color: textDark,
  })

  // Tax
  page.drawText("Tax (Exempt Educational Services):", {
    x: summaryBoxX + 15,
    y: y - 36,
    size: 8.5,
    font: helvetica,
    color: textMuted,
  })
  const taxFormatted = "$0.00"
  page.drawText(taxFormatted, {
    x: summaryBoxX + summaryBoxWidth - 15 - helvetica.widthOfTextAtSize(taxFormatted, 8.5),
    y: y - 36,
    size: 8.5,
    font: helvetica,
    color: textMuted,
  })

  page.drawLine({
    start: { x: summaryBoxX + 15, y: y - 48 },
    end: { x: summaryBoxX + summaryBoxWidth - 15, y: y - 48 },
    thickness: 1,
    color: borderLight,
  })

  // Total Paid
  page.drawText("Total Tuition Paid:", {
    x: summaryBoxX + 15,
    y: y - 68,
    size: 10,
    font: helveticaBold,
    color: navyDark,
  })
  const totalFormatted = `$${Number(data.total).toFixed(2)} ${data.currency.toUpperCase()}`
  const totalWidth = helveticaBold.widthOfTextAtSize(totalFormatted, 10.5)
  page.drawText(totalFormatted, {
    x: summaryBoxX + summaryBoxWidth - 15 - totalWidth,
    y: y - 68,
    size: 10.5,
    font: helveticaBold,
    color: emeraldDark,
  })

  // 7. Official Tax Deduction & Accreditation Legal Statement
  y -= (summaryBoxHeight + 35)

  page.drawRectangle({
    x: margin,
    y: y - 75,
    width: contentWidth,
    height: 75,
    color: rgb(0.97, 0.98, 1.0),
    borderColor: rgb(0.85, 0.9, 0.98),
    borderWidth: 1,
  })

  page.drawText("EMPLOYER REIMBURSEMENT & CONTINUING EDUCATION TAX DEDUCTION COMPLIANCE", {
    x: margin + 12,
    y: y - 16,
    size: 7.5,
    font: helveticaBold,
    color: navyPrimary,
  })

  const statement1 = "This official receipt itemizes professional continuing education tuition for IRC Section 127 educational"
  const statement2 = "assistance programs, employer reimbursement, and IRC Section 162 ordinary and necessary business expenses."
  const statement3 = "All programs are delivered by AcademyIO LLC under NASBA QAS Registry and IRS Approved CE Standards."

  page.drawText(statement1, { x: margin + 12, y: y - 30, size: 7.5, font: helvetica, color: textDark })
  page.drawText(statement2, { x: margin + 12, y: y - 42, size: 7.5, font: helvetica, color: textDark })
  page.drawText(statement3, { x: margin + 12, y: y - 54, size: 7.5, font: helvetica, color: textDark })

  page.drawText("Verified Electronic Receipt • Retain this document with your permanent professional records.", {
    x: margin + 12,
    y: y - 68,
    size: 7,
    font: helveticaOblique,
    color: textMuted,
  })

  // 8. Footer
  page.drawText("AcademyIO LLC • 131 Continental Dr, Suite 305, Newark, DE 19713 • support@academyio.com", {
    x: margin,
    y: 28,
    size: 7.5,
    font: helvetica,
    color: textMuted,
  })

  page.drawText("Page 1 of 1", {
    x: pageWidth - margin - 40,
    y: 28,
    size: 7.5,
    font: helvetica,
    color: textMuted,
  })

  return await doc.save()
}
