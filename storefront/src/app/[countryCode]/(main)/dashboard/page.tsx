import React from "react"
import { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { retrieveCustomer } from "@lib/data/customer"
import { getCustomerCertificates, getCustomerEntitlements, getCustomerSubscription, getWebinars } from "@lib/data/webinars"
import { listOrders } from "@lib/data/orders"
import CustomerDashboardView from "@/components/dashboard/CustomerDashboardView"
import { Lock, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Customer Dashboard | AcademyIO",
  robots: { index: false, follow: false },
}

export default async function DashboardPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const rawTab = searchParams.tab || "overview"
  const activeTab = rawTab === "webinars" ? "overview" : rawTab

  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value
  const customer = await retrieveCustomer()

  // Strict auth gate: require verified customer session (never bypass on expired/forged cookie)
  if (!customer || !token) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm border border-blue-200 dark:border-blue-800">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign In to Customer Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300 max-w-md mx-auto">
            Please log in with your verified credentials to access your purchased live webinars, video recordings,
            transcripts, study materials, and certificates.
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/${countryCode}/login`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Sign In to Your Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={`/${countryCode}/register`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl transition-colors"
            >
              Register as New Member
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const [{ webinars = [] }, ordersRes, entitlementsData, subscriptionData, certificatesData] = await Promise.all([
    getWebinars({ limit: 100 }).catch(() => ({ webinars: [] })),
    listOrders(50).catch(() => []),
    getCustomerEntitlements(token).catch(() => null),
    getCustomerSubscription(token).catch(() => null),
    getCustomerCertificates(token, customer.id).catch(() => null),
  ])
  const ordersList = ordersRes || []

  return (
    <CustomerDashboardView
      customer={customer}
      summary={
        entitlementsData?.summary || {
          total_orders_with_webinars: ordersList.length,
        }
      }
      purchasedWebinars={entitlementsData?.purchased_webinars || []}
      rawEntitlements={entitlementsData?.raw_entitlements || []}
      orders={ordersList}
      webinars={webinars}
      countryCode={countryCode}
      activeTab={activeTab}
      initialSubscription={subscriptionData}
      initialCertificates={certificatesData}
      authToken={token}
    />
  )
}
