"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, UserCheck, ShieldCheck, Phone, Building2, Users, Plus, Trash2 } from "lucide-react"
import { signup } from "@lib/data/customer"
import TurnstileWidget from "@components/captcha/TurnstileWidget"

export default function RegisterPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const countryCode = (params?.countryCode as string) || "us"
  const returnUrl = searchParams.get("returnUrl") || searchParams.get("redirect") || ""
  const isCheckoutIntent = returnUrl.includes("checkout")

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([""])
  const [ptin, setPtin] = useState("")
  const [cfpId, setCfpId] = useState("")
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAttendeeEmailChange = (index: number, val: string) => {
    const updated = [...attendeeEmails]
    updated[index] = val
    setAttendeeEmails(updated)
  }

  const handleAddAttendeeEmail = () => {
    if (attendeeEmails.length < 15) {
      setAttendeeEmails([...attendeeEmails, ""])
    }
  }

  const handleRemoveAttendeeEmail = (index: number) => {
    if (attendeeEmails.length === 1) {
      setAttendeeEmails([""])
    } else {
      setAttendeeEmails(attendeeEmails.filter((_, i) => i !== index))
    }
  }

  const handlePtinChange = (val: string) => {
    // Auto-remove spaces and enforce uppercase
    const cleaned = val.replace(/\s+/g, "").toUpperCase()
    setPtin(cleaned)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError("Please enter your full name.")
      setLoading(false)
      return
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Please enter your email address.")
      setLoading(false)
      return
    }

    if (!password) {
      setError("Please enter a password.")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      setLoading(false)
      return
    }

    const trimmedPhone = phone.trim()
    if (!trimmedPhone) {
      setError("Please enter your phone number.")
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.")
      setLoading(false)
      return
    }

    if (!captchaToken) {
      setError("Please complete the security verification challenge before creating your account.")
      setLoading(false)
      return
    }

    const nameParts = trimmedName.split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

    // Validate PTIN# format if provided: Must start with P followed by 8 digits (no spaces)
    const trimmedPtin = ptin.trim().toUpperCase()
    if (trimmedPtin) {
      if (!/^P\d{8}$/.test(trimmedPtin)) {
        setError(
          "PTIN# is invalid. For Enrolled Agents, it must start with a 'P' followed by 8 digits with no spaces (e.g. P12345678)."
        )
        setLoading(false)
        return
      }
    }

    // Filter and validate attendee emails
    const validAttendeeEmails = attendeeEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)

    for (const attEmail of validAttendeeEmails) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attEmail)) {
        setError(`"${attEmail}" is not a valid email address. Please verify attendee email format.`)
        setLoading(false)
        return
      }
    }

    const formData = new FormData()
    formData.append("full_name", trimmedName)
    formData.append("first_name", firstName)
    formData.append("last_name", lastName)
    formData.append("email", trimmedEmail)
    formData.append("password", password)
    formData.append("phone", trimmedPhone)
    formData.append("company_name", companyName.trim())
    formData.append("additional_attendee_emails", JSON.stringify(validAttendeeEmails))
    formData.append("additional_attendee_email", validAttendeeEmails.join(", "))
    formData.append("ptin", trimmedPtin)
    formData.append("cfp_id", cfpId.trim())
    formData.append("cf-turnstile-response", captchaToken)
    formData.append("captcha_token", captchaToken)

    try {
      const result = await signup(null, formData)
      if (typeof result === "string") {
        setError(result)
        // Refresh CAPTCHA widget on error so a fresh token is generated
        setCaptchaToken("")
        setCaptchaResetKey((k) => k + 1)
      } else {
        window.location.href = returnUrl || `/${countryCode}/dashboard`
        return
      }
    } catch (err: any) {
      setError(err?.message || "Failed to register account.")
      setCaptchaToken("")
      setCaptchaResetKey((k) => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm space-y-6 transition-colors">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-200 dark:border-blue-800">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isCheckoutIntent ? "Register to Complete Enrollment" : "Create Professional Account"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            {isCheckoutIntent
              ? "Create your verified professional profile to complete your checkout and receive your attendance credentials."
              : "Join thousands of CPAs, Enrolled Agents, and tax specialists. Immediate access to continuing education tracking and certificates."}
          </p>
        </div>

        {/* Checkout Intent Notice */}
        {isCheckoutIntent && (
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs rounded-xl flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>One Step Away:</strong> Your webinar selection is safely preserved. Once registered, you will be taken directly to checkout.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@firm.com"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Password (immediately after email) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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

          {/* Phone Number (Required) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Phone Number *</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (555) 234-5678"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>

          {/* Company / Firm Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Company / Firm Name</label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company / Firm Name LLP"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Additional Attendee – Enter Email Id (Customer can add multiple emails) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 my-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <label className="text-xs font-bold text-gray-900 dark:text-white">
                  Additional Attendee – Enter Email Id
                </label>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 font-normal">Optional</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
              Add multiple colleagues or team member email IDs to also receive webinar access links and attendance tracking.
            </p>

            <div className="space-y-2.5 pt-1">
              {attendeeEmails.map((attEmail, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={attEmail}
                      onChange={(e) => handleAttendeeEmailChange(idx, e.target.value)}
                      placeholder={`Attendee ${idx + 1} Email (e.g. colleague@firm.com)`}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  {attendeeEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendeeEmail(idx)}
                      title="Remove attendee email"
                      className="p-2 text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddAttendeeEmail}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer pt-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Attendee Email</span>
              </button>
            </div>
          </div>

          {/* Accreditation Information Section */}
          <div className="pt-3 pb-1 border-t border-b border-gray-100 dark:border-slate-800 space-y-3.5 my-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Accreditation Information</span>
                <span className="text-[10px] font-normal text-gray-400 dark:text-slate-500 lowercase">(optional)</span>
              </h2>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">IRS & CFP Reporting</span>
            </div>

            {/* PTIN# & CFP ID# in a 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PTIN# */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  PTIN# <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">(Enrolled Agents only)</span>
                </label>
                <input
                  type="text"
                  value={ptin}
                  onChange={(e) => handlePtinChange(e.target.value)}
                  placeholder="P12345678"
                  maxLength={9}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white font-mono uppercase tracking-wider placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                  Starts with a P followed by 8 digits (no spaces).
                </p>
              </div>

              {/* CFP ID# */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  CFP ID# <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">(CFP Holders only)</span>
                </label>
                <input
                  type="text"
                  value={cfpId}
                  onChange={(e) => setCfpId(e.target.value.trim())}
                  placeholder="e.g. 294810"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 dark:text-white font-mono placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                  For CFP Designation holders only.
                </p>
              </div>
            </div>
          </div>

          {/* Anti-Bot Honeypot Field (invisible to humans) */}
          <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
            <label htmlFor="website_url_hp">Leave this field blank</label>
            <input
              type="text"
              id="website_url_hp"
              name="website_url_hp"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Cloudflare Turnstile Security Verification */}
          <div className="pt-1">
            <TurnstileWidget
              key={captchaResetKey}
              onVerify={(token) => {
                setCaptchaToken(token)
                setError(null)
              }}
              onExpire={() => setCaptchaToken("")}
              onError={(err) => setError(err)}
            />
          </div>

          {/* Terms & Conditions Acceptance */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
              />
              <span>
                I agree to the{" "}
                <Link href={`/${countryCode}/terms`} target="_blank" className="text-blue-600 dark:text-blue-400 underline font-medium">
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link href={`/${countryCode}/privacy`} target="_blank" className="text-blue-600 dark:text-blue-400 underline font-medium">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading
              ? "Creating Account..."
              : !captchaToken
              ? "Complete Verification to Continue"
              : isCheckoutIntent
              ? "Create Account & Proceed to Checkout"
              : "Create Professional Account"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-gray-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            href={`/${countryCode}/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  )
}
