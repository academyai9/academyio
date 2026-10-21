"use client"

import React, { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, KeyRound } from "lucide-react"
import { confirmPasswordReset } from "@lib/data/customer"

function ResetPasswordContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const countryCode = (params?.countryCode as string) || "us"

  const urlToken = searchParams.get("token") || ""
  const urlEmail = searchParams.get("email") || ""

  const [token, setToken] = useState(urlToken)
  const [email, setEmail] = useState(urlEmail)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (urlToken && !token) setToken(urlToken)
    if (urlEmail && !email) setEmail(urlEmail)
  }, [urlToken, urlEmail])

  // Password validation checks
  const hasMinLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const isFormValid = hasMinLength && hasUpper && hasNumberOrSpecial && passwordsMatch && Boolean(token.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token.trim()) {
      setError("Please provide a valid password reset token.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters in length.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.")
      return
    }

    setLoading(true)

    try {
      const res = await confirmPasswordReset({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        password,
      })

      if (res.success) {
        setSuccess(true)
        // Automatically redirect to login after a brief celebration
        setTimeout(() => {
          router.push(`/${countryCode}/login?reset_success=true`)
        }, 2500)
      } else {
        setError(res.error || "Failed to reset password. Please request a new link.")
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 sm:p-9 shadow-sm space-y-6 transition-colors">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-200 dark:border-blue-800 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Password</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Choose a strong, secure password for your AcademyIO professional customer account.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="space-y-1">
              <span className="font-semibold block">{error}</span>
              {error.includes("expired") || error.includes("invalid") ? (
                <Link
                  href={`/${countryCode}/forgot-password`}
                  className="underline font-bold text-red-800 dark:text-red-200 block text-[11px]"
                >
                  Click here to request a fresh reset link →
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {success ? (
          /* Success Screen */
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                Password Successfully Reset!
              </h2>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Your credentials have been updated securely. Redirecting you to the customer portal login...
              </p>
            </div>

            <div className="pt-2">
              <Link
                href={`/${countryCode}/login?reset_success=true`}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Sign In Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registered Email (if known) */}
            {email && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3.5 py-2 text-xs bg-gray-100 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 rounded-xl cursor-not-allowed font-medium"
                />
              </div>
            )}

            {/* Token field (only shown if not in URL) */}
            {!urlToken && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Reset Verification Token
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste 64-character reset token from email"
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-mono bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter at least 8 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Validation Requirements Strip */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${hasMinLength ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500"}`}>
                  ✓
                </span>
                <span className={hasMinLength ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-500 dark:text-slate-400"}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${hasUpper ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500"}`}>
                  ✓
                </span>
                <span className={hasUpper ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-500 dark:text-slate-400"}>
                  At least one uppercase letter (A-Z)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${hasNumberOrSpecial ? "bg-emerald-500 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500"}`}>
                  ✓
                </span>
                <span className={hasNumberOrSpecial ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-500 dark:text-slate-400"}>
                  At least one number or special character
                </span>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${passwordsMatch ? "bg-emerald-500 text-white" : "bg-red-400 text-white"}`}>
                    {passwordsMatch ? "✓" : "✕"}
                  </span>
                  <span className={passwordsMatch ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400"}>
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-gray-500 dark:text-slate-400">
          Need a new reset link?{" "}
          <Link href={`/${countryCode}/forgot-password`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Request Password Reset
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[85vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
