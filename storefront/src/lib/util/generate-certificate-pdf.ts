import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export interface CertificatePdfData {
  certificate_number: string
  customer_name: string
  webinar_title: string
  speaker_name?: string | null
  event_date?: string | Date | null
  issue_date?: string | Date | null
  cpe_credits?: number | string | null
  score_percentage?: number | string | null
  signatory_name?: string | null
  signatory_title?: string | null
  issuer_name?: string | null
  category?: string | null
}

export async function generateCertificatePdf(data: CertificatePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  // Landscape Letter: 11" x 8.5" (792 x 612 pt)
  const page = doc.addPage([792, 612])

  // Embed Standard Fonts
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const timesRoman = await doc.embedFont(StandardFonts.TimesRoman)
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic)

  // Palette
  const navy = rgb(0.06, 0.12, 0.28) // #0f1f47
  const gold = rgb(0.76, 0.52, 0.12) // #c2841e
  const goldLight = rgb(0.85, 0.65, 0.25)
  const slateDark = rgb(0.2, 0.25, 0.33)
  const slateMuted = rgb(0.42, 0.48, 0.58)

  const width = 792
  const height = 612
  const centerX = width / 2

  // Helper for centered text
  const drawCentered = (
    text: string,
    y: number,
    size: number,
    font: any,
    color: any
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size)
    page.drawText(text, {
      x: centerX - textWidth / 2,
      y,
      size,
      font,
      color,
    })
  }

  // 1. Elegant Double Borders
  // Outer Navy Border
  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: navy,
    borderWidth: 3.5,
  })

  // Inner Gold Border
  page.drawRectangle({
    x: 34,
    y: 34,
    width: width - 68,
    height: height - 68,
    borderColor: gold,
    borderWidth: 1.5,
  })

  // Corner Accent Marks
  const cornerSize = 18
  const corners = [
    { x: 38, y: height - 38 - cornerSize },
    { x: width - 38 - cornerSize, y: height - 38 - cornerSize },
    { x: 38, y: 38 },
    { x: width - 38 - cornerSize, y: 38 },
  ]
  for (const c of corners) {
    page.drawRectangle({
      x: c.x,
      y: c.y,
      width: cornerSize,
      height: cornerSize,
      borderColor: goldLight,
      borderWidth: 1,
    })
  }

  // 2. Organization Header & Credentials
  drawCentered("ACADEMYIO CONTINUING PROFESSIONAL EDUCATION", 544, 13, helveticaBold, navy)
  drawCentered("NATIONAL REGISTRY OF CPE SPONSORS • IRS APPROVED CE PROVIDER", 528, 8.5, helvetica, slateMuted)

  // Thin Gold Line Divider
  page.drawLine({
    start: { x: 220, y: 518 },
    end: { x: width - 220, y: 518 },
    thickness: 1,
    color: gold,
  })

  // 3. Main Title
  drawCentered("CERTIFICATE OF PARTICIPATION", 478, 26, timesBold, gold)
  drawCentered("CONTINUING EDUCATION VERIFICATION & ACCREDITATION", 456, 8.5, helveticaBold, slateMuted)

  // 4. Certification Body
  drawCentered("This is to officially certify that", 422, 11.5, timesItalic, slateDark)

  // Recipient Name
  const recipientName = (data.customer_name || "Webinar Participant").toUpperCase()
  drawCentered(recipientName, 390, 22, timesBold, navy)

  // Recipient Underline
  const nameWidth = timesBold.widthOfTextAtSize(recipientName, 22)
  const linePad = 30
  page.drawLine({
    start: { x: Math.max(160, centerX - nameWidth / 2 - linePad), y: 384 },
    end: { x: Math.min(width - 160, centerX + nameWidth / 2 + linePad), y: 384 },
    thickness: 1,
    color: gold,
  })

  // Attestation text
  drawCentered(
    "has successfully completed the live interactive program and demonstrated mastery on the comprehensive CPE evaluation for:",
    354,
    9.5,
    helvetica,
    slateDark
  )

  // Course Title
  const courseTitle = data.webinar_title || "Accredited Continuing Professional Education Webinar"
  // Truncate course title if exceedingly long
  const displayTitle = courseTitle.length > 80 ? courseTitle.substring(0, 77) + "..." : courseTitle
  drawCentered(displayTitle, 326, 14, helveticaBold, navy)

  // Faculty Line
  const faculty = data.speaker_name ? `Lead Faculty: ${data.speaker_name}` : "AcademyIO Master Faculty"
  drawCentered(faculty, 304, 10, timesItalic, slateMuted)

  // 5. Verification Data Card Box
  const boxY = 224
  const boxHeight = 58
  page.drawRectangle({
    x: 80,
    y: boxY,
    width: width - 160,
    height: boxHeight,
    borderColor: rgb(0.88, 0.9, 0.94),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.99),
  })

  // Box Columns
  const fmtDate = (d?: string | Date | null) => {
    if (!d) return "October 2026"
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return String(d)
    }
  }

  const completionDate = fmtDate(data.event_date || data.issue_date)
  const issueDate = fmtDate(data.issue_date)
  const credits = `${data.cpe_credits || 1.0} CPE Hours`
  const score = `${data.score_percentage || 75}% (Pass: 75%)`
  const certId = data.certificate_number || "CERT-ACAD-2026-000000"

  // Col 1: Date & Credits
  page.drawText("Completion Date:", { x: 100, y: boxY + 36, size: 8, font: helveticaBold, color: slateMuted })
  page.drawText(completionDate, { x: 100, y: boxY + 20, size: 9.5, font: helveticaBold, color: navy })

  page.drawText("CPE Credits Awarded:", { x: 250, y: boxY + 36, size: 8, font: helveticaBold, color: slateMuted })
  page.drawText(credits, { x: 250, y: boxY + 20, size: 9.5, font: helveticaBold, color: gold })

  // Col 2: Score & Issue Date
  page.drawText("Comprehension Score:", { x: 410, y: boxY + 36, size: 8, font: helveticaBold, color: slateMuted })
  page.drawText(score, { x: 410, y: boxY + 20, size: 9.5, font: helveticaBold, color: navy })

  // Col 3: Certificate ID
  page.drawText("Certificate ID Number:", { x: 570, y: boxY + 36, size: 8, font: helveticaBold, color: slateMuted })
  page.drawText(certId, { x: 570, y: boxY + 20, size: 9.5, font: helveticaBold, color: navy })

  // 6. Signatures Section
  const sigY = 138

  // Left Signature
  page.drawLine({
    start: { x: 100, y: sigY },
    end: { x: 280, y: sigY },
    thickness: 1,
    color: slateMuted,
  })
  const sigName = data.signatory_name || data.speaker_name || "Lead Instructor"
  const sigTitle = data.signatory_title || "Lead Faculty / CPE Course Director"
  page.drawText(sigName, { x: 100, y: sigY - 14, size: 9.5, font: timesBold, color: navy })
  page.drawText(sigTitle, { x: 100, y: sigY - 26, size: 8, font: helvetica, color: slateMuted })
  page.drawText(data.issuer_name || "AcademyIO Continuing Professional Education", {
    x: 100,
    y: sigY - 37,
    size: 7.5,
    font: helvetica,
    color: slateMuted,
  })

  // Center Gold Crest Seal
  page.drawCircle({
    x: centerX,
    y: sigY - 10,
    size: 26,
    borderColor: gold,
    borderWidth: 2,
    color: rgb(0.99, 0.98, 0.95),
  })
  page.drawCircle({
    x: centerX,
    y: sigY - 10,
    size: 22,
    borderColor: goldLight,
    borderWidth: 0.8,
  })
  drawCentered("OFFICIAL", sigY - 7, 6.5, helveticaBold, gold)
  drawCentered("CPE SEAL", sigY - 15, 6, helveticaBold, navy)
  drawCentered("VERIFIED", sigY - 22, 5.5, helveticaBold, slateMuted)

  // Right Signature
  page.drawLine({
    start: { x: width - 280, y: sigY },
    end: { x: width - 100, y: sigY },
    thickness: 1,
    color: slateMuted,
  })
  page.drawText("Dr. Jennifer Ross, CPA", { x: width - 280, y: sigY - 14, size: 9.5, font: timesBold, color: navy })
  page.drawText("Academic Director & Compliance Dean", { x: width - 280, y: sigY - 26, size: 8, font: helvetica, color: slateMuted })
  page.drawText(`Issued: ${issueDate}`, { x: width - 280, y: sigY - 37, size: 7.5, font: helvetica, color: slateMuted })

  // 7. Footer Accreditation Statement
  drawCentered(
    "In accordance with the standards of the National Registry of CPE Sponsors and IRS Continuing Education Provider Guidelines.",
    54,
    7.5,
    helvetica,
    slateMuted
  )
  drawCentered(
    `Official Verification Registry URL: https://academyio.com/verify/${certId}`,
    43,
    6.5,
    helvetica,
    rgb(0.5, 0.55, 0.65)
  )

  return await doc.save()
}
