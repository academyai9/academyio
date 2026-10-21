"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff, UserCheck } from "lucide-react"
import { login } from "@lib/data/customer"

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const countryCode = (params?.countryCode as string) || "us"
  const isLoggedOut = searchParams.get("logged_out") === "true"
  const isResetSuccess = searchParams.get("reset_success") === "true"
  const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect") || ""

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore remembered credentials preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const isRemembered = localStorage.getItem("academyio_remember_me") === "true"
        const savedEmail = localStorage.getItem("academyio_remembered_email")
        if (isRemembered && savedEmail) {
          setEmail(savedEmail)
          setRememberMe(true)
        }
      } catch (_) {}
    }
  }, [])

  const isCheckoutIntent = returnUrl.includes("checkout")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Handle Remember Me persistence
    if (typeof window !== "undefined") {
      try {
        if (rememberMe) {
          localStorage.setItem("academyio_remembered_email", email.trim())
          localStorage.setItem("academyio_remember_me", "true")
        } else {
          localStorage.removeItem("academyio_remembered_email")
          localStorage.removeItem("academyio_remember_me")
        }
      } catch (_) {}
    }

    const formData = new FormData()
    formData.append("email", email.trim())
    formData.append("password", password)

    try {
      const result = await login(null, formData)
      if (result) {
        setError(typeof result === "string" ? result : "Invalid email or password.")
      } else {
        window.location.href = returnUrl || `/${countryCode}/dashboard`
        return
      }
    } catch (err: any) {
      setError(err?.message || "Failed to log in.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm space-y-6 transition-colors">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-200 dark:border-blue-800">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isCheckoutIntent ? "Sign In to Complete Enrollment" : "Sign In to Customer Portal"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            {isCheckoutIntent
              ? "Sign in to your professional account to continue with your secure enrollment."
              : "Access your purchased webinars, live links, video recordings, and study resources."}
          </p>
        </div>

        {/* Checkout Intent Notice */}
        {isCheckoutIntent && (
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs rounded-xl flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Authentication Required:</strong> Please sign in or register to complete your order. Your selected webinar has been preserved in your cart.
            </span>
          </div>
        )}

        {isLoggedOut && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block text-emerald-900 dark:text-emerald-200">Logged Out Successfully</span>
              <span>Your session has been securely ended. Enter your credentials below to log back in.</span>
            </div>
          </div>
        )}

        {isResetSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold block text-emerald-900 dark:text-emerald-200">Password Reset Successfully</span>
              <span>Your new credentials are now active. Please sign in below to access your dashboard.</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 dark:text-slate-200 font-medium">
              <input
                type="checkbox"
                id="remember_me"
                name="remember_me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 dark:bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            <Link
              href={`/${countryCode}/forgot-password`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {loading ? "Authenticating..." : isCheckoutIntent ? "Sign In & Proceed to Checkout" : "Sign In to Dashboard"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-gray-500 dark:text-slate-400">
          Don't have an account yet?{" "}
          <Link
            href={`/${countryCode}/register${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Register as New Member
          </Link>
        </div>
      </div>
    </div>
  )
}
