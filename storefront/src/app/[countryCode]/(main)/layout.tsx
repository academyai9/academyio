import { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import Navbar from "@/components/navigation/Navbar"
import Footer from "@/components/navigation/Footer"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "AcademyIO | Continuing Education & Professional Webinars",
  description:
    "Accredited professional webinars, seminars, recorded sessions, transcripts, and downloadable materials for tax, accounting, and finance professionals.",
}

export default async function PageLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans antialiased">
      <Navbar countryCode={countryCode} />
      <main className="flex-1">{props.children}</main>
      <Footer countryCode={countryCode} />
    </div>
  )
}
