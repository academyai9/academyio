"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, ShieldCheck, Zap, Sparkles, CreditCard, ArrowRight, HelpCircle } from "lucide-react"
import { SubscriptionPlan, CustomerSubscription, subscribeToPlan } from "@lib/data/webinars"

interface SubscriptionPlansViewProps {
  plans: SubscriptionPlan[]
  currentSubscription?: CustomerSubscription | null
  isLoggedIn: boolean
  countryCode: string
  authToken?: string
}

export default function SubscriptionPlansView({
  plans,
  currentSubscription,
  isLoggedIn,
  countryCode,
  authToken,
}: SubscriptionPlansViewProps) {
  const router = useRouter()
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      router.prefetch(`/${countryCode}/register`)
    }
  }, [countryCode, router])

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!authToken) {
      router.push(`/${countryCode}/register?returnUrl=/${countryCode}/subscriptions/checkout?plan_id=${plan.id}`)
      return
    }
    router.push(`/${countryCode}/subscriptions/checkout?plan_id=${plan.id}`)
  }

  return (
    <div className="space-y-16">
      {/* Messages */}
      {successMessage && (
        <div className="max-w-2xl mx-auto p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
          <Check className="w-5 h-5 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
          {errorMessage}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const isCurrentPlan =
            currentSubscription?.is_active && currentSubscription?.plan_id === plan.id
          const isPopular = plan.slug?.includes("professional") || plan.name?.toLowerCase().includes("professional")

          return (
            <div
              key={plan.id}
              className={`rounded-3xl flex flex-col justify-between transition-all duration-200 relative ${
                isPopular
                  ? "bg-slate-900 text-white border-2 border-blue-500 shadow-2xl scale-105 z-10 p-8"
                  : "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 border border-gray-200 dark:border-slate-800 shadow-sm p-7 hover:shadow-md"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-600 text-white shadow-md flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-extrabold">{plan.name}</h3>
                  {isCurrentPlan && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Active Plan
                    </span>
                  )}
                </div>

                <p className={`text-xs min-h-[36px] ${isPopular ? "text-slate-300" : "text-gray-500 dark:text-slate-400"}`}>
                  {plan.description || "Comprehensive monthly professional access package."}
                </p>

                {/* Price Display */}
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">${plan.price}</span>
                  <span className={`text-xs font-semibold ${isPopular ? "text-slate-400" : "text-gray-500 dark:text-slate-400"}`}>
                    / month
                  </span>
                </div>

                {/* Included Features List */}
                <div className="mt-8 pt-6 border-t border-gray-200/20 dark:border-slate-800 space-y-3.5 text-xs">
                  <div className="flex items-center gap-2.5 font-semibold">
                    <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-blue-400" : "text-blue-600 dark:text-blue-400"}`} />
                    <span>
                      {plan.webinar_access_limit
                        ? `${plan.webinar_access_limit} webinars included per month`
                        : "Unlimited webinar registrations"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-blue-400" : "text-blue-600 dark:text-blue-400"}`} />
                    <span className={plan.includes_live ? "font-medium" : "opacity-50 line-through"}>
                      Live interactive webinars & Q&A
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-blue-400" : "text-blue-600 dark:text-blue-400"}`} />
                    <span className={plan.includes_recording ? "font-medium" : "opacity-50 line-through"}>
                      Full HD self-study recordings library
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-blue-400" : "text-blue-600 dark:text-blue-400"}`} />
                    <span className={plan.includes_transcript ? "font-medium" : "opacity-50 line-through"}>
                      Full written verbatim transcripts
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-blue-400" : "text-blue-600 dark:text-blue-400"}`} />
                    <span className={plan.includes_pdf ? "font-medium" : "opacity-50 line-through"}>
                      Downloadable study guides & checklists
                    </span>
                  </div>

                  {plan.benefits && plan.benefits.length > 0 && (
                    <div className="pt-3 border-t border-gray-200/10 dark:border-slate-800 space-y-2">
                      {plan.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <Check className={`w-4 h-4 shrink-0 ${isPopular ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-6 border-t border-gray-200/20 dark:border-slate-800">
                {isCurrentPlan ? (
                  <button
                    onClick={() => router.push(`/${countryCode}/dashboard?tab=subscription`)}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                  >
                    Manage Subscription
                  </button>
                ) : (
                  <button
                    disabled={loadingPlanId === plan.id}
                    onClick={() => handleSubscribe(plan)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isPopular
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                        : "bg-gray-900 hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
                    } disabled:opacity-60`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Choose Plan • ${plan.price}/mo</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust & Guarantee Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm">Instant Access</h4>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Gain immediate access to all scheduled webinars and the full video catalog the second you enroll.
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm">Cancel Anytime</h4>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            No lock-in contracts or cancellation penalties. Cancel directly from your customer dashboard with one click.
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm">Secure Monthly Billing</h4>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Encrypted payment handling powered by Stripe with automated invoice and receipt delivery.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">Frequently Asked Questions</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Everything you need to know about our professional subscription tiers.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How do monthly subscriptions differ from individual webinar purchases?",
              a: "Individual webinar purchases provide lifetime access to that specific session and chosen variant. Monthly subscriptions grant access to our entire catalog of webinars, live sessions, video recordings, transcripts, and study guides for a predictable monthly fee.",
            },
            {
              q: "Can I earn CPE credits under a subscription plan?",
              a: "Yes! All subscription plans (Basic, Professional, Premium) include attendance verification and certificate generation for all live webinars attended while your membership is active.",
            },
            {
              q: "How do I access webinars included in my plan?",
              a: "Once subscribed, simply log in to your account. When browsing any webinar, your subscription credentials automatically authorize access, and all eligible live links and downloads will appear in your Customer Dashboard.",
            },
            {
              q: "Can I cancel or change plans at any time?",
              a: "Yes. You can manage or cancel your subscription directly from the 'My Subscription' tab in your Customer Dashboard. If canceled, you retain full access until the end of your prepaid monthly billing period.",
            },
          ].map((faq, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-2">
              <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                {faq.q}
              </h4>
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
