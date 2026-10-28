"use client"

import React, { useEffect, useState, use } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react"
import { getUnsubscribeInfo, unsubscribeFromNewsletter } from "@lib/data/newsletter"

export default function NewsletterUnsubscribePage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const resolvedParams = use(params)
  const countryCode = resolvedParams.countryCode || "us"
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(Boolean(token))
  const [submitting, setSubmitting] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [manualEmail, setManualEmail] = useState("")
  const [reason, setReason] = useState("Too many emails")
  const [customReason, setCustomReason] = useState("")
  const [status, setStatus] = useState<"ready" | "unsubscribed" | "already_unsubscribed" | "error">("ready")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    // If no token in URL, allow user to enter their email directly (e.g. from footer link)
    if (!token) {
      setLoading(false)
      setStatus("ready")
      return
    }

    let isMounted = true

    getUnsubscribeInfo(token)
      .then((res) => {
        if (!isMounted) return
        setLoading(false)
        if (res.success) {
          setMaskedEmail(res.maskedEmail || "your email")
          if (res.status === "unsubscribed") {
            setStatus("already_unsubscribed")
          } else {
            setStatus("ready")
          }
        } else {
          setStatus("error")
          setErrorMessage(res.error || "Invalid or expired unsubscribe link. You can still enter your email manually below.")
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setLoading(false)
        setStatus("error")
        setErrorMessage(err.message || "Failed to load unsubscribe details. Please try entering your email manually.")
      })

    return () => {
      isMounted = false
    }
  }, [token])

  const handleConfirmUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalReason = reason === "Other" ? customReason : reason

    if (!token && !manualEmail.trim()) {
      setErrorMessage("Please enter a valid email address.")
      return
    }

    setSubmitting(true)
    setErrorMessage("")

    try {
      const res = await unsubscribeFromNewsletter({
        token: token || undefined,
        email: !token ? manualEmail.trim() : undefined,
        reason: finalReason || "User opted out",
      })

      if (res.success) {
        if (!maskedEmail && manualEmail) {
          setMaskedEmail(manualEmail.trim())
        }
        if (res.alreadyUnsubscribed) {
          setStatus("already_unsubscribed")
        } else {
          setStatus("unsubscribed")
        }
      } else {
        setStatus("error")
        setErrorMessage(res.error || "Failed to process unsubscribe request.")
      }
    } catch (err: any) {
      setStatus("error")
      setErrorMessage(err.message || "An unexpected error occurred.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 text-center">
        {loading ? (
          <div className="py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Checking Subscription Status...
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Verifying your secure unsubscribe link
            </p>
          </div>
        ) : status === "unsubscribed" || status === "already_unsubscribed" ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {status === "already_unsubscribed" ? "Already Unsubscribed" : "You Are Unsubscribed"}
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {maskedEmail && <strong>{maskedEmail}</strong>} has been successfully unsubscribed from AcademyIO marketing emails.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-2 text-left leading-relaxed">
              <p>
                <strong>Please note:</strong> You will no longer receive newsletter announcements, course discounts, or promotional updates.
              </p>
              <p>
                If you have an active customer account or purchase webinar access in the future, you will still receive critical transactional communications (such as order receipts and live webinar join links).
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/${countryCode}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                <span>Return to Homepage</span>
              </Link>
            </div>
          </div>
        ) : status === "ready" ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <Mail className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Newsletter Unsubscribe
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {token && maskedEmail ? (
                  <>
                    Are you sure you want to stop receiving educational updates and webinar notices for{" "}
                    <span className="font-mono font-bold text-gray-900 dark:text-white">{maskedEmail}</span>?
                  </>
                ) : (
                  "Manage your communication preferences. Enter your email below to opt out of AcademyIO marketing emails."
                )}
              </p>
            </div>

            <form onSubmit={handleConfirmUnsubscribe} className="space-y-4 text-left">
              {/* Direct email input when no token is present */}
              {!token && (
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-gray-700 dark:text-slate-300">
                    Your Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="e.g. name@company.com"
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Reason Selection */}
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-gray-700 dark:text-slate-300">
                  Why are you unsubscribing? <span className="text-gray-400 font-normal">(Help us improve)</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Too many emails">I receive too many emails</option>
                  <option value="Content not relevant to my profession">Content is no longer relevant to my profession</option>
                  <option value="Never signed up for this list">I never signed up for this mailing list</option>
                  <option value="Spam or unwanted emails">I consider this content spam</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              {reason === "Other" && (
                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-gray-700 dark:text-slate-300">
                    Please specify:
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Your feedback..."
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Unsubscribing...</span>
                  </>
                ) : (
                  <span>Confirm Unsubscribe</span>
                )}
              </button>
            </form>

            <p className="text-[11px] text-gray-400">
              No account login required. Your email address will be placed on our suppression list immediately.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Unable to Process Link
              </h1>
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setStatus("ready")
                  setErrorMessage("")
                }}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
              >
                Enter Email Manually
              </button>
              <Link
                href={`/${countryCode}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                <span>Return to Homepage</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
