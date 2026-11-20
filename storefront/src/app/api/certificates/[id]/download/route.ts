import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { retrieveCustomer } from "@lib/data/customer"
import { generateCertificatePdf } from "@lib/util/generate-certificate-pdf"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"
import { sdk } from "@lib/config"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ message: "Invalid certificate ID" }, { status: 400 })
  }

  try {
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get("_medusa_jwt")?.value || null
    const authHeader = request.headers.get("authorization")
    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.replace("Bearer ", "").trim()
        : null

    const effectiveToken = cookieToken || bearerToken
    let customer = await retrieveCustomer()

    // If not resolved from httpOnly cookie, verify bearer token strictly via backend API
    if (!customer && bearerToken) {
      try {
        const res = await sdk.client.fetch<{ customer: any }>("/store/customers/me", {
          headers: {
            authorization: `Bearer ${bearerToken}`,
            "x-publishable-api-key": PUBLISHABLE_KEY,
          },
          cache: "no-store",
        })
        customer = res.customer
      } catch {
        customer = null
      }
    }

    if (!customer || !effectiveToken) {
      return NextResponse.json(
        { message: "Authentication required to download certificate" },
        { status: 401 }
      )
    }

    // Fetch certificate strictly through authenticated backend endpoint (enforces customer_id === actor_id)
    const certApiRes = await fetch(
      `${BACKEND_URL}/store/customer/certificates/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${effectiveToken}`,
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    )

    if (!certApiRes.ok) {
      return NextResponse.json(
        { message: "Certificate not found or unauthorized access" },
        { status: certApiRes.status === 401 ? 401 : 404 }
      )
    }

    const { certificate: cert } = await certApiRes.json()
    if (!cert) {
      return NextResponse.json(
        { message: "Certificate not found or unauthorized access" },
        { status: 404 }
      )
    }

    const pdfBytes = await generateCertificatePdf({
      certificate_number: cert.certificate_number,
      customer_name:
        cert.customer_name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        customer.email,
      webinar_title: cert.webinar_title || cert.web_title,
      speaker_name: cert.speaker_name || cert.web_speaker,
      event_date: cert.event_date || cert.webinar_event_date || cert.web_date,
      issue_date: cert.issue_date,
      cpe_credits: cert.cpe_credits,
      score_percentage: cert.score_percentage,
      signatory_name: cert.signatory_name || cert.web_speaker,
      signatory_title: cert.signatory_title,
      issuer_name: cert.issuer_name,
      category: cert.webinar_category || cert.web_category,
    })

    // Sanitize certificate_number to prevent Content-Disposition header injection
    const safeCertNum = String(cert.certificate_number || id).replace(/[^a-zA-Z0-9_-]/g, "")

    return new NextResponse(Buffer.from(pdfBytes) as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Certificate-${safeCertNum}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error: any) {
    console.error("Error generating certificate PDF:", error?.message || error)
    return NextResponse.json({ message: "Failed to generate certificate PDF" }, { status: 500 })
  }
}
