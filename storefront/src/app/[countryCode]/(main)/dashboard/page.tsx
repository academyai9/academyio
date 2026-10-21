import React from "react"
import { cookies } from "next/headers"
import Link from "next/link"
import { retrieveCustomer } from "@lib/data/customer"
import { getCustomerCertificates, getCustomerEntitlements, getCustomerSubscription, getWebinars } from "@lib/data/webinars"
import { listOrders } from "@lib/data/orders"
import CustomerDashboardView from "@/components/dashboard/CustomerDashboardView"
import { Lock, ArrowRight, ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

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

  let entitlementsData = null
  let subscriptionData = null
  let certificatesData = null
  let ordersList: any[] = []

  const [{ webinars = [] }, ordersRes] = await Promise.all([
    getWebinars({ limit: 100 }).catch(() => ({ webinars: [] })),
    listOrders(50).catch(() => []),
  ])
  ordersList = ordersRes || []

  let tokenCustomerId: string | null = null
  let tokenEmail: string | null = null
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString())
      tokenCustomerId = payload.actor_id || payload.app_metadata?.customer_id || null
      tokenEmail = payload.email || payload.user_metadata?.email || null
    } catch (_) {}
  }

  if (token) {
    const [entRes, subRes] = await Promise.all([
      getCustomerEntitlements(token).catch(() => null),
      getCustomerSubscription(token).catch(() => null),
    ])
    entitlementsData = entRes
    subscriptionData = subRes

    const effectiveCustomerId =
      customer?.id || tokenCustomerId || entitlementsData?.purchased_webinars?.[0]?.customer_id
    certificatesData = await getCustomerCertificates(token, effectiveCustomerId).catch(() => null)
  }

  // If unauthenticated, show a clean, professional login gate
  if (!customer && !entitlementsData && !token) {
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

  const effectiveCustomerId =
    customer?.id || tokenCustomerId || entitlementsData?.purchased_webinars?.[0]?.customer_id || ""

  return (
    <CustomerDashboardView
      customer={
        customer || {
          id: effectiveCustomerId,
          email: entitlementsData?.customer_email || tokenEmail || "",
          first_name: "Member",
          last_name: "Account",
        }
      }
      summary={
        entitlementsData?.summary || {
          total_orders_with_webinars: ordersList.length || 2,
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
      authToken={token || ""}
    />
  )
}
