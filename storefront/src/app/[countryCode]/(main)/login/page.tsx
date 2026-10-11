"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react"
import { login } from "@lib/data/customer"

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "us"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("email", email)
    formData.append("password", password)

    try {
      const result = await login(null, formData)
      if (result) {
        setError(typeof result === "string" ? result : "Invalid email or password.")
      } else {
        router.push(`/${countryCode}/dashboard`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err?.message || "Failed to log in.")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoFill = () => {
    setEmail("customer@academyio.com")
    setPassword("Password123!")
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign In to Customer Portal</h1>
          <p className="text-xs text-gray-500">
            Access your purchased webinars, live links, video recordings, and study resources.
          </p>
        </div>

        {/* Demo Fast-Fill Pill */}
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-800">
          <div>
            <span className="font-semibold block">Need to test?</span>
            <span className="text-[11px] text-blue-600">customer@academyio.com</span>
          </div>
          <button
            type="button"
            onClick={handleQuickDemoFill}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Auto Fill
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700">Password</label>
              <Link
                href={`/${countryCode}/forgot-password`}
                className="text-xs text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? "Authenticating..." : "Sign In to Dashboard"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
          Don't have an account yet?{" "}
          <Link href={`/${countryCode}/register`} className="font-bold text-blue-600 hover:underline">
            Register as New Member
          </Link>
        </div>
      </div>
    </div>
  )
}
