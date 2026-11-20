"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { KeyRound, Mail, ArrowRight, CheckCircle2, AlertCircle, ExternalLink, Copy, Check, ShieldCheck, UserCheck } from "lucide-react"
import { requestPasswordReset } from "@lib/data/customer"

export default function ForgotPasswordPage() {
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "us"

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await requestPasswordReset(email)
      if (res.success) {
        setResult(res)
      } else {
        setError(res.error || "Failed to process password reset.")
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = (link: string) => {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}${link}`
      navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 sm:p-9 shadow-sm space-y-6 transition-colors">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-200 dark:border-blue-800 shadow-xs">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Enter your registered professional email address to receive password reset instructions.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {result ? (
          /* Uniform Secure Reset Confirmation (no token exposure, no account enumeration) */
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto stroke-[2.2]" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Check Your Email
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                {result.message ||
                  "If an account exists with this email address, you will receive password reset instructions shortly."}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href={`/${countryCode}/login`}
                className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold hover:underline"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-slate-800 text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>We will verify your credentials and provide a secure, single-use reset link.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Secure Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Instructions</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-gray-500 dark:text-slate-400">
          Remember your password?{" "}
          <Link href={`/${countryCode}/login`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
