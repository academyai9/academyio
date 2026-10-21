import React from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Calendar,
  CreditCard,
  ShieldCheck,
  Video,
  PlayCircle,
  FileText,
  Download,
  ArrowRight,
  LayoutDashboard,
  Sparkles,
} from "lucide-react"
import { getSubscriptionPlans } from "@lib/data/webinars"

export const metadata = {
  title: "Subscription Activated | AcademyIO",
  description: "Your monthly webinar membership is active.",
}

export default async function SubscriptionConfirmedPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ subscription_id?: string; plan_id?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const subscriptionId = searchParams.subscription_id || "csub_active_new"
  const planId = searchParams.plan_id

  const plans = await getSubscriptionPlans()
  const matchedPlan = plans.find((p) => p.id === planId) || plans[0]

  const now = new Date()
  const renewalDate = new Date(now)
  renewalDate.setDate(renewalDate.getDate() + 30)

  const formattedStart = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const formattedRenewal = renewalDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="min-h-[80vh] py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Celebration Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 sm:p-10 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Membership Activated
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
            Subscription Confirmed!
          </h1>

          <p className="text-sm text-gray-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Congratulations! You now have unrestricted access to all accredited webinars, self-study video
            recordings, verbatim transcripts, and professional study resources.
          </p>

          {/* Details Card */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-left bg-gray-50/70 dark:bg-slate-800/60 rounded-2xl p-6 border border-gray-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-200/60 dark:border-slate-700 gap-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Plan Name</span>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{matchedPlan ? matchedPlan.name : "Professional All-Access Pass"}</p>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active • Monthly Auto-Renewal
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <span className="text-gray-500 dark:text-slate-400 block font-medium">Subscription ID</span>
                <span className="font-mono text-gray-800 dark:text-slate-200 font-semibold truncate block">{subscriptionId}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400 block font-medium">Monthly Rate</span>
                <span className="text-gray-900 dark:text-slate-100 font-bold text-sm">
                  ${matchedPlan ? matchedPlan.price : 99}.00 USD / mo
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400 block font-medium">Next Renewal Date</span>
                <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">{formattedRenewal}</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-gray-500 dark:text-slate-400 border-t border-gray-200/60 dark:border-slate-700 flex items-center justify-between">
              <span>Activated on: {formattedStart}</span>
              <span>Manage or cancel anytime with zero fees in Customer Dashboard</span>
            </div>
          </div>

          {/* Unlocked Benefits Summary */}
          <div className="pt-6 space-y-3 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 text-center">
              What's Ready in Your Dashboard
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center gap-2.5">
                <Video className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-gray-700 dark:text-slate-200 font-medium">Join Any Upcoming Live Session</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center gap-2.5">
                <PlayCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-gray-700 dark:text-slate-200 font-medium">Watch Full HD Video Replays</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-gray-700 dark:text-slate-200 font-medium">Read Verbatim Transcripts</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center gap-2.5">
                <Download className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-gray-700 dark:text-slate-200 font-medium">Download PDF Handouts & Slides</span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/${countryCode}/dashboard?tab=subscription`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Customer Dashboard</span>
            </Link>

            <Link
              href={`/${countryCode}/webinars/pre-recorded`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
            >
              <PlayCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Browse Pre-Recorded Webinars</span>
              <ArrowRight className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
