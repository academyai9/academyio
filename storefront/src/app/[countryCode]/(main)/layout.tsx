import { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import Navbar from "@/components/navigation/Navbar"
import Footer from "@/components/navigation/Footer"
import { retrieveCustomer } from "@lib/data/customer"
import { getStoreTrackingCodes } from "@lib/data/tracking-codes"
import FrontendTrackingLoader from "@/components/analytics/FrontendTrackingLoader"
import CookieManager from "@/components/cookies/CookieManager"

// Global fetch timeout patch to protect Next.js page data collection against 300s undici hangs
if (
  typeof globalThis !== "undefined" &&
  typeof globalThis.fetch === "function" &&
  !(globalThis as any).__fetch_timeout_guarded
) {
  const _origFetch = globalThis.fetch
  ;(globalThis as any).__fetch_timeout_guarded = true

  globalThis.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
    if (init?.signal) {
      return _origFetch(input, init)
    }

    const controller = new AbortController()
    const timeoutMs = 4000
    const timeoutId = setTimeout(
      () => controller.abort(new Error("Global fetch timeout (4s)")),
      timeoutMs
    )

    try {
      return await _origFetch(input, {
        ...init,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans antialiased transition-colors overflow-x-hidden">
      <FrontendTrackingLoader trackingCodes={trackingCodes} />
      <Navbar countryCode={countryCode} customer={customer} />
      <main className="flex-1">{props.children}</main>
      <Footer countryCode={countryCode} />
      <CookieManager countryCode={countryCode} />
    </div>
  )
}
