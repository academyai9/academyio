import { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import Navbar from "@/components/navigation/Navbar"
import Footer from "@/components/navigation/Footer"
import { retrieveCustomer } from "@lib/data/customer"
import { getStoreTrackingCodes } from "@lib/data/tracking-codes"
import FrontendTrackingLoader from "@/components/analytics/FrontendTrackingLoader"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "AcademyIO | Continuing Education & Professional Webinars",
  description:
    "Accredited professional webinars, live broadcasts, recorded sessions, transcripts, and downloadable materials for tax, accounting, and finance professionals.",
}

export default async function PageLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [customer, trackingCodes] = await Promise.all([
    retrieveCustomer(),
    getStoreTrackingCodes(),
  ])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans antialiased transition-colors">
      <FrontendTrackingLoader trackingCodes={trackingCodes} />
      <Navbar countryCode={countryCode} customer={customer} />
      <main className="flex-1">{props.children}</main>
      <Footer countryCode={countryCode} />
    </div>
  )
}
