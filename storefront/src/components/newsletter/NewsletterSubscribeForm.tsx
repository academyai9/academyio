"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles, ShieldCheck } from "lucide-react"
import { subscribeToNewsletter } from "@lib/data/newsletter"

interface NewsletterSubscribeFormProps {
  countryCode?: string
  source?: string
  variant?: "compact" | "card"
  className?: string
}

export default function NewsletterSubscribeForm({
  countryCode = "us",
  source = "website_footer",
  variant = "card",
  className = "",
}: NewsletterSubscribeFormProps) {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "already_active" | "error"
    message: string
  }>({
    type: "idle",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@")) {
      setStatus({ type: "error", message: "Please enter a valid email address." })
      return
    }

    if (!consent) {
      setStatus({
        type: "error",
        message: "Please check the consent box to agree to receiving email updates.",
      })
      return
    }

    setSubmitting(true)
    setStatus({ type: "idle", message: "" })

    try {
      const res = await subscribeToNewsletter({
        email,
        firstName: firstName || undefined,
        consent,
        source,
      })

      if (!res.success) {
        setStatus({
          type: "error",
          message: res.error || "Failed to process subscription. Please try again.",
        })
      } else if (res.status === "active") {
        setStatus({
          type: "already_active",
          message: "You are already subscribed to AcademyIO newsletters!",
        })
      } else {
        setStatus({
          type: "success",
          message:
            "Thank you! A confirmation email has been sent. Please click the link inside to activate your subscription.",
        })
        setEmail("")
        setFirstName("")
        setConsent(false)
      }
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err.message || "An unexpected error occurred. Please try again later.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (variant === "compact") {
    return (
      <div className={`space-y-3 ${className}`}>
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-gray-400 focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-start gap-2 pt-0.5">
            <input
              id={`consent-compact-${source}`}
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded-sm border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor={`consent-compact-${source}`} className="text-[11px] text-gray-400 leading-tight">
              I agree to receive continuing education updates in accordance with the{" "}
              <Link href={`/${countryCode}/privacy`} className="text-blue-400 underline hover:text-blue-300">
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Subscribing...</span>
              </>
            ) : (
              <>
                <span>Subscribe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {status.type !== "idle" && (
          <div
            className={`p-2.5 rounded-xl text-[11px] leading-relaxed flex items-start gap-2 ${
              status.type === "success" || status.type === "already_active"
                ? "bg-emerald-950/70 border border-emerald-800 text-emerald-300"
                : "bg-red-950/70 border border-red-800 text-red-300"
            }`}
          >
            {status.type === "success" || status.type === "already_active" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    )
  }

  // Card Variant (for Homepage, Dedicated sections)
  return (
    <div className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6 ${className}`}>
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
          <Mail className="w-3.5 h-3.5" />
          <span>AcademyIO Educational Briefing</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Stay Ahead of Tax & Financial Regulations
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
          Join thousands of CPAs, CFOs, and tax practitioners who receive our monthly CPE webinar calendar, regulatory breakdowns, and early-bird course discounts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              First Name <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. David"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="david@accountingfirm.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id={`consent-${source}`}
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded-md border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor={`consent-${source}`} className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed cursor-pointer">
            I agree to receive continuing education updates, webinar notifications, and exclusive offers from AcademyIO. I have read and agree to the{" "}
            <Link href={`/${countryCode}/privacy`} className="text-blue-600 dark:text-blue-400 underline font-semibold hover:text-blue-700">
              Privacy Policy
            </Link>
            .
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Subscribing...</span>
            </>
          ) : (
            <>
              <span>Subscribe to Newsletter</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Status Messages */}
      {status.type !== "idle" && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-start gap-3 transition-all ${
            status.type === "success" || status.type === "already_active"
              ? "bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          {status.type === "success" || status.type === "already_active" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-bold">
              {status.type === "success"
                ? "Confirmation Email Sent!"
                : status.type === "already_active"
                ? "Already Subscribed"
                : "Subscription Notice"}
            </p>
            <p className="leading-relaxed">{status.message}</p>
          </div>
        </div>
      )}

      {/* Trust Badges Footer */}
      <div className="pt-2 border-t border-gray-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Double opt-in verified
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          No spam, strictly accredited CPE content
        </span>
        <span className="flex items-center gap-1.5">
          1-click unsubscribe anytime
        </span>
      </div>
    </div>
  )
}
