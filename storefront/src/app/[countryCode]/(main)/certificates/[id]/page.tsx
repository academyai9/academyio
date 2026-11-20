import { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"
import CertificateView from "@components/certificates/CertificateView"

export const metadata: Metadata = {
  title: "CPE Certificate | AcademyIO",
  robots: { index: false, follow: false },
}

export default async function CertificatePage(props: {
  params: Promise<{ countryCode: string; id: string }>
}) {
  const { countryCode, id } = await props.params

  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value
  const customer = await retrieveCustomer()
  if (!customer || !token) {
    redirect(`/${countryCode}/login?redirect=/${countryCode}/certificates/${encodeURIComponent(id)}`)
  }

  const certApiRes = await fetch(
    `${BACKEND_URL}/store/customer/certificates/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    }
  )

  if (!certApiRes.ok) {
    notFound()
  }

  const { certificate: cert } = await certApiRes.json()
  if (!cert) {
    notFound()
  }

  return (
    <CertificateView
      certificate={{
        id: cert.id,
        certificate_number: cert.certificate_number,
        customer_name:
          cert.customer_name ||
          `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
          customer.email,
        customer_email: cert.customer_email,
        webinar_title: cert.webinar_title || cert.web_title,
        speaker_name: cert.speaker_name || cert.web_speaker,
        event_date: cert.event_date || cert.webinar_event_date || cert.web_date,
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
}
