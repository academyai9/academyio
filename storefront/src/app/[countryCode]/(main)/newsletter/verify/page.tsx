"use client"

import React, { useEffect, useState, use } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle, Clock, ArrowRight, BookOpen, Loader2, Mail } from "lucide-react"
import { verifyNewsletterSubscription } from "@lib/data/newsletter"
import NewsletterSubscribeForm from "@/components/newsletter/NewsletterSubscribeForm"

export default function NewsletterVerifyPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const resolvedParams = use(params)
  const countryCode = resolvedParams.countryCode || "us"
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<"success" | "already_active" | "expired" | "invalid">("invalid")
  const [message, setMessage] = useState("")
  const [subscriberEmail, setSubscriberEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setStatus("invalid")
      setMessage("No verification token was provided in the confirmation link.")
      return
    }

    let isMounted = true

    verifyNewsletterSubscription(token)
      .then((res) => {
        if (!isMounted) return
        setLoading(false)
        if (res.success) {
          if (res.reason === "already_active") {
            setStatus("already_active")
            setMessage("Your email subscription is already verified and active!")
          } else {
            setStatus("success")
            setMessage("Your subscription has been verified successfully. Welcome to AcademyIO!")
          }
          if (res.subscriber?.email) {
            setSubscriberEmail(res.subscriber.email)
          }
        } else {
          if (res.reason === "expired") {
            setStatus("expired")
            setMessage("This confirmation link has expired (links are valid for 48 hours).")
          } else {
            setStatus("invalid")
            setMessage(res.error || "The confirmation link is invalid or has already been used.")
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setLoading(false)
        setStatus("invalid")
        setMessage(err.message || "An unexpected error occurred during verification.")
      })

    return () => {
      isMounted = false
    }
  }, [token])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 text-center">
        {loading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Verifying Your Subscription...
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Please wait while we confirm your email address.
            </p>
          </div>
        ) : status === "success" || status === "already_active" ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Subscription Confirmed!
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {message}
              </p>
              {subscriberEmail && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">
                  {subscriberEmail}
                </p>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              You will now receive notifications about accredited live webinars, CPE credits, regulatory changes, and exclusive early-bird discounts.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${countryCode}/webinars`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Explore Webinars</span>
              </Link>
              <Link
                href={`/${countryCode}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold text-xs transition-colors"
              >
                <span>Return to Homepage</span>
              </Link>
            </div>
          </div>
        ) : status === "expired" ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Link Has Expired
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {message} Confirmation links are valid for 48 hours for your protection.
              </p>
            </div>

            <div className="text-left p-4 rounded-2xl bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 space-y-3">
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Resubscribe to receive a fresh verification link:
              </p>
              <NewsletterSubscribeForm
                countryCode={countryCode}
                source="verification_expired"
                variant="compact"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Invalid Confirmation Link
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {message}
              </p>
            </div>

            <div className="text-left p-4 rounded-2xl bg-gray-50 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 space-y-3">
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Subscribe with your email below:
              </p>
              <NewsletterSubscribeForm
                countryCode={countryCode}
                source="verification_invalid"
                variant="compact"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
