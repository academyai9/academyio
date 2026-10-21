import React from "react"
import Link from "next/link"
import { ChevronRight, Sparkles } from "lucide-react"
import { getSubscriptionPlans, getCustomerSubscription } from "@lib/data/webinars"
import { retrieveCustomer } from "@lib/data/customer"
import { getAuthHeaders } from "@lib/data/cookies"
import SubscriptionPlansView from "@/components/subscriptions/SubscriptionPlansView"

export const metadata = {
  title: "Monthly Subscription Packages | AcademyIO",
  description:
    "Unlimited access to accredited live webinars, self-study masterclasses, transcripts, and study guides for a simple monthly rate.",
}

export default async function SubscriptionsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  const authHeaders = await getAuthHeaders()
  const token = (authHeaders as any)?.authorization?.replace("Bearer ", "") || ""

  const plans = await getSubscriptionPlans()

  let currentSubscription = null
  if (token) {
    const subData = await getCustomerSubscription(token)
    if (subData?.has_subscription) {
      currentSubscription = subData.subscription
    }
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb & Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <nav className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-800 dark:text-slate-200 font-semibold">Subscriptions</span>
          </nav>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Professional Membership Plans
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Flexible Monthly Access to Every Webinar
          </h1>

          <p className="text-base text-gray-600 dark:text-slate-400 leading-relaxed">
            Elevate your continuing education with unlimited live broadcasts, self-study recordings,
            verbatim transcripts, and comprehensive reference guides.
          </p>
        </div>

        {/* Client Plan Selector & Grid */}
        <SubscriptionPlansView
          plans={plans}
          currentSubscription={currentSubscription}
          isLoggedIn={Boolean(customer)}
          countryCode={countryCode}
          authToken={token}
        />
      </div>
    </div>
  )
}
