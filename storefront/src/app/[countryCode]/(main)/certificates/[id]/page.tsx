import { notFound, redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import CertificateView from "@components/certificates/CertificateView"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export default async function CertificatePage(props: {
  params: Promise<{ countryCode: string; id: string }>
}) {
  const { countryCode, id } = await props.params

  const customer = await retrieveCustomer()
  if (!customer) {
    redirect(`/${countryCode}/login?redirect=/${countryCode}/certificates/${id}`)
  }

  const client = await pool.connect()
  try {
    const certRes = await client.query(
      `SELECT c.*, w.title as web_title, w.speaker_name as web_speaker, w.event_date as web_date
       FROM webinar_certificate c
       LEFT JOIN webinar w ON c.webinar_id = w.id
       WHERE c.id = $1 AND (c.customer_id = $2 OR c.customer_email = $3) AND c.deleted_at IS NULL`,
      [id, customer.id, customer.email]
    )

    if (certRes.rows.length === 0) {
      notFound()
    }

    const cert = certRes.rows[0]

    return (
      <CertificateView
        certificate={{
          id: cert.id,
          certificate_number: cert.certificate_number,
          customer_name: cert.customer_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email,
          customer_email: cert.customer_email,
          webinar_title: cert.webinar_title || cert.web_title,
          speaker_name: cert.speaker_name || cert.web_speaker,
          event_date: cert.event_date || cert.web_date,
          issue_date: cert.issue_date,
          cpe_credits: Number(cert.cpe_credits) || 1.0,
          score_percentage: Number(cert.score_percentage) || 75,
          signatory_name: cert.signatory_name,
          signatory_title: cert.signatory_title,
          issuer_name: cert.issuer_name,
          status: cert.status,
        }}
        countryCode={countryCode}
      />
    )
  } finally {
    client.release()
  }
}
