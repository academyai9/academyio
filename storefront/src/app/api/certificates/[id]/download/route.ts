import { NextRequest, NextResponse } from "next/server"
import { retrieveCustomer } from "@lib/data/customer"
import { generateCertificatePdf } from "@lib/util/generate-certificate-pdf"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

import { sdk } from "@lib/config"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  let customer = await retrieveCustomer()
  const client = await pool.connect()
  try {
    if (!customer) {
      const authHeader = request.headers.get("authorization")
      let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : null
      if (!token) {
        token = request.nextUrl.searchParams.get("token")
      }

      if (token) {
        try {
          const res = await sdk.client.fetch<{ customer: any }>("/store/customers/me", {
            headers: {
              authorization: `Bearer ${token}`,
              "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978",
            },
            cache: "no-store",
          })
          customer = res.customer
        } catch {}

        if (!customer) {
          try {
            const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString())
            if (decoded && decoded.actor_id) {
              const custCheck = await client.query("SELECT id, email, first_name, last_name FROM customer WHERE id = $1", [decoded.actor_id])
              if (custCheck.rows.length > 0) {
                customer = custCheck.rows[0]
              }
            }
          } catch {}
        }
      }
    }

    if (!customer) {
      const customerIdQuery = request.nextUrl.searchParams.get("customer_id")
      if (customerIdQuery) {
        const custCheck = await client.query("SELECT id, email, first_name, last_name FROM customer WHERE id = $1", [customerIdQuery])
        if (custCheck.rows.length > 0) {
          customer = custCheck.rows[0]
        }
      }
    }

    if (!customer) {
      return NextResponse.json({ message: "Authentication required to download certificate" }, { status: 401 })
    }

    const certRes = await client.query(
      `SELECT c.*, w.title as web_title, w.speaker_name as web_speaker, w.category as web_category, w.event_date as web_date
       FROM webinar_certificate c
       LEFT JOIN webinar w ON c.webinar_id = w.id
       WHERE c.id = $1 AND (c.customer_id = $2 OR c.customer_email = $3) AND c.deleted_at IS NULL`,
      [id, customer.id, customer.email]
    )

    if (certRes.rows.length === 0) {
      return NextResponse.json({ message: "Certificate not found or unauthorized access" }, { status: 404 })
    }

    const cert = certRes.rows[0]

    const pdfBytes = await generateCertificatePdf({
      certificate_number: cert.certificate_number,
      customer_name: cert.customer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email,
      webinar_title: cert.webinar_title || cert.web_title,
      speaker_name: cert.speaker_name || cert.web_speaker,
      event_date: cert.event_date || cert.web_date,
      issue_date: cert.issue_date,
      cpe_credits: cert.cpe_credits,
      score_percentage: cert.score_percentage,
      signatory_name: cert.signatory_name || cert.web_speaker,
      signatory_title: cert.signatory_title,
      issuer_name: cert.issuer_name,
      category: cert.web_category,
    })

    return new NextResponse(Buffer.from(pdfBytes) as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Certificate-${cert.certificate_number}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("Error generating certificate PDF:", error)
    return NextResponse.json({ message: "Failed to generate certificate PDF", error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}
