import React from "react"
import { cookies } from "next/headers"
import Link from "next/link"
import { retrieveCustomer } from "@lib/data/customer"
import { getCustomerEntitlements } from "@lib/data/webinars"
import CustomerDashboardView from "@/components/dashboard/CustomerDashboardView"
import { Lock, ArrowRight, ShieldCheck } from "lucide-react"

export default async function DashboardPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const activeTab = searchParams.tab || "overview"

  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value
  const customer = await retrieveCustomer()

  let entitlementsData = null
  if (token) {
    entitlementsData = await getCustomerEntitlements(token)
  }

  // If unauthenticated, show a clean login prompt with quick demo link
  if (!customer && !entitlementsData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Sign In to Customer Dashboard</h1>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Please log in with your verified credentials to access your purchased live webinars, video recordings,
            transcripts, and study materials.
          </p>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Pre-seeded Demo Customer Credentials:</span>
          </div>
          <p className="text-xs font-mono text-gray-600 bg-white p-2 rounded border border-gray-200 inline-block">
            customer@academyio.com • Password123!
          </p>
          <div>
            <Link
              href={`/${countryCode}/login`}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Go to Login Page
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <CustomerDashboardView
      customer={customer || { email: "customer@academyio.com", first_name: "Jane", last_name: "Doe" }}
      summary={entitlementsData?.summary || { total_orders_with_webinars: 2 }}
      purchasedWebinars={entitlementsData?.purchased_webinars || []}
      countryCode={countryCode}
      activeTab={activeTab}
    />
  )
}
