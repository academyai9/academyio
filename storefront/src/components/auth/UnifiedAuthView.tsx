"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  Phone,
  Building2,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  UserPlus,
  AlertCircle,
  Award,
  Check,
  LogIn,
} from "lucide-react"
import { login, signup } from "@lib/data/customer"
import { sanitizeRedirectPath } from "@lib/util/safe-redirect"
import TurnstileWidget from "@components/captcha/TurnstileWidget"

type AuthMode = "register" | "login"

interface UnifiedAuthViewProps {
  initialMode?: AuthMode
}

export default function UnifiedAuthView({ initialMode = "register" }: UnifiedAuthViewProps) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const countryCode = (params?.countryCode as string) || "us"
  const rawReturnUrl = searchParams.get("returnUrl") || searchParams.get("redirect") || ""
  const returnUrl = sanitizeRedirectPath(rawReturnUrl, "")
  const tabParam = searchParams.get("tab")
  const isLoggedOut = searchParams.get("logged_out") === "true"
  const isResetSuccess = searchParams.get("reset_success") === "true"
  const isCheckoutIntent = returnUrl.includes("checkout")

  // Active Tab State (0ms instant client-side switch)
  const [activeTab, setActiveTab] = useState<AuthMode>(() => {
    if (tabParam === "login") return "login"
    if (tabParam === "register") return "register"
    return initialMode
  })

  // Synchronize when URL search param tab changes
  useEffect(() => {
    if (tabParam === "login" || tabParam === "register") {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Shared Credential State
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Login Specific State
  const [rememberMe, setRememberMe] = useState(false)

  // Register Specific State
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [attendeeEmails, setAttendeeEmails] = useState<string[]>([""])
  const [ptin, setPtin] = useState("")
  const [cfpId, setCfpId] = useState("")
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [acceptTerms, setAcceptTerms] = useState(true)

  // Restore remembered credentials on mount
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

  // Smooth Tab Switcher without page reload
  const handleSwitchTab = (mode: AuthMode) => {
    setActiveTab(mode)
    setError(null)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.pathname = mode === "register" ? `/${countryCode}/register` : `/${countryCode}/login`
      window.history.replaceState(null, "", url.toString())
    }
  }

  // Captcha Callbacks
  const handleCaptchaVerify = React.useCallback((token: string) => {
    setCaptchaToken(token)
    setError(null)
  }, [])

  const handleCaptchaExpire = React.useCallback(() => {
    setCaptchaToken("")
  }, [])

  const handleCaptchaError = React.useCallback(() => {
    setCaptchaToken("")
  }, [])

  // Attendee Handlers
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
    const cleaned = val.replace(/\s+/g, "").toUpperCase()
    setPtin(cleaned)
  }

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
    formData.append("email", email.trim().toLowerCase())
    formData.append("password", password)

    try {
      const result = await login(null, formData)
      if (result) {
        setError(typeof result === "string" ? result : "Invalid email or password.")
        setLoading(false)
      } else {
        setIsSuccess(true)
        const dest = returnUrl || `/${countryCode}/dashboard`
        window.location.replace(dest)
        return
      }
    } catch (err: any) {
      setError(err?.message || "Failed to log in.")
      setLoading(false)
    }
  }

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
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

    const trimmedPtin = ptin.trim().toUpperCase()
    if (trimmedPtin && !/^P\d{8}$/.test(trimmedPtin)) {
      setError(
        "PTIN# is invalid. For Enrolled Agents, it must start with a 'P' followed by 8 digits with no spaces (e.g. P12345678)."
      )
      setLoading(false)
      return
    }

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
    formData.append("email", trimmedEmail.toLowerCase())
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
        setCaptchaToken("")
        setCaptchaResetKey((k) => k + 1)
        setLoading(false)
      } else {
        setIsSuccess(true)
        const dest = returnUrl || `/${countryCode}/dashboard`
        window.location.replace(dest)
        return
      }
    } catch (err: any) {
      setError(err?.message || "Failed to register account.")
      setCaptchaToken("")
      setCaptchaResetKey((k) => k + 1)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[88vh] flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60 dark:bg-slate-950/40 transition-colors">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Authority & Trust Panel (Desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 text-white rounded-3xl border border-blue-800/40 shadow-xl space-y-8 sticky top-28">
          <div>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>AcademyIO CPE & CE Platform</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white mb-3">
              Fast-Track Your Professional Growth
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Join thousands of CPAs, Enrolled Agents, Controllers, and Tax Specialists earning accredited credits nationwide.
            </p>
          </div>

          {/* Key Platform Benefits */}
          <div className="space-y-4 pt-2 border-t border-blue-800/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Instant CPE Credit Tracking</h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5">
                  Automated attendance verification, downloadable certificates, and direct reporting.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Nationally Recognized Faculty</h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5">
                  Learn directly from top industry authorities, seasoned attorneys, and former regulators.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">1-Year Full Access to Materials</h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5">
                  HD recorded video replay, searchable verbatim transcript, and comprehensive slide decks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Firm & Team Multi-Attendee Support</h4>
                <p className="text-[11px] text-slate-300 leading-normal mt-0.5">
                  Easily register team members and colleagues under one consolidated account.
                </p>
              </div>
            </div>
          </div>

          {/* Accreditation Logos Showcase */}
          <div className="pt-4 border-t border-blue-800/50 space-y-2.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">
              Recognized & Accredited Programs:
            </span>
            <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-xl backdrop-blur-xs border border-white/10">
              <div className="h-7 px-2 bg-white rounded flex items-center justify-center">
                <img src="/logos/irs.png" alt="IRS Approved CE" className="h-5 object-contain" />
              </div>
              <div className="h-7 px-2 bg-white rounded flex items-center justify-center">
                <img src="/logos/nasba.png" alt="NASBA CPE Sponsor" className="h-5 object-contain" />
              </div>
              <div className="h-7 px-2 bg-white rounded flex items-center justify-center">
                <img src="/logos/hrci.png" alt="HRCI Approved" className="h-5 object-contain" />
              </div>
              <div className="h-7 px-2 bg-white rounded flex items-center justify-center">
                <img src="/logos/shrm.png" alt="SHRM Recertification" className="h-5 object-contain" />
              </div>
            </div>
          </div>

          {/* User Testimonial */}
          <div className="p-3.5 bg-blue-950/60 rounded-2xl border border-blue-800/60">
            <p className="text-xs text-slate-200 italic leading-relaxed">
              "AcademyIO made our team's annual CE compliance seamless. Excellent speakers, timely tax topics, and immediate certificates."
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-[10px] font-bold flex items-center justify-center text-white">
                SM
              </div>
              <span className="text-[11px] font-semibold text-blue-300">Sarah M., CPA & Tax Director</span>
            </div>
          </div>
        </div>

        {/* Right Side: The Unified Auth Card */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors space-y-6">
          
          {/* Header Title */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {activeTab === "register"
                ? isCheckoutIntent
                  ? "Register to Complete Enrollment"
                  : "Create Professional Account"
                : isCheckoutIntent
                ? "Sign In to Complete Enrollment"
                : "Sign In to Customer Portal"}
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {activeTab === "register"
                ? isCheckoutIntent
                  ? "Your selected webinar is safely preserved in your cart. Fast 30-second registration."
                  : "Immediate access to accredited webinars, certificates & replays."
                : isCheckoutIntent
                ? "Sign in to access your saved cart and finalize your credentials."
                : "Access your purchased webinars, certificates, transcripts & study materials."}
            </p>
          </div>

          {/* Segmented Top Tabs: 0ms Switch between Register and Login */}
          <div className="grid grid-cols-2 p-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => handleSwitchTab("register")}
              className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab("login")}
              className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "login"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Sign In Instead</span>
            </button>
          </div>

          {/* Checkout Intent Notice */}
          {isCheckoutIntent && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>One Step Away:</strong> Your webinar selection is safely preserved. Once signed in or registered, you will be taken directly to checkout.
              </span>
            </div>
          )}

          {/* Logged Out / Password Reset Alerts for Login */}
          {activeTab === "login" && isLoggedOut && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your session has been securely ended. Enter your credentials below to log back in.</span>
            </div>
          )}

          {activeTab === "login" && isResetSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl font-medium flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your new password is now active. Please sign in below to access your dashboard.</span>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: REGISTER FORM                                     */}
          {/* ======================================================== */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-fadeIn">
              {/* Row 1: Full Name & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. (555) 234-5678"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 font-mono transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane.doe@firm.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors"
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

              {/* Company / Firm Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
                    Company / Firm Name
                  </label>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">Optional</span>
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Anderson & Associates LLP"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>

              {/* Additional Attendees */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <label className="text-xs font-bold text-gray-900 dark:text-white">
                      Additional Attendee – Enter Email Id
                    </label>
                  </div>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Optional
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
                  Add colleagues or team member email IDs to also receive webinar access links and attendance credentials.
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
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
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
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Attendee Email</span>
                  </button>
                </div>
              </div>

              {/* Accreditation Details */}
              <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Accreditation Details</span>
                    <span className="text-[10px] font-normal text-gray-400 dark:text-slate-500 lowercase">(optional)</span>
                  </h3>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
                    IRS & CFP Reporting
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                      PTIN# <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">(Enrolled Agents)</span>
                    </label>
                    <input
                      type="text"
                      value={ptin}
                      onChange={(e) => handlePtinChange(e.target.value)}
                      placeholder="P12345678"
                      maxLength={9}
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white font-mono uppercase tracking-wider placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                      Starts with P followed by 8 digits (no spaces).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                      CFP ID# <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">(CFP Holders)</span>
                    </label>
                    <input
                      type="text"
                      value={cfpId}
                      onChange={(e) => setCfpId(e.target.value.trim())}
                      placeholder="e.g. 294810"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900 dark:text-white font-mono placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                      For CFP Designation holders only.
                    </p>
                  </div>
                </div>
              </div>

              {/* Anti-Bot Honeypot Field */}
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

              {/* Cloudflare Turnstile Verification */}
              <div className="pt-1">
                <TurnstileWidget
                  key={captchaResetKey}
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                  onError={handleCaptchaError}
                />
              </div>

              {/* Terms Acceptance */}
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isSuccess || !captchaToken}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
              >
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>{isCheckoutIntent ? "Verified! Taking you to Checkout..." : "Success! Redirecting to Dashboard..."}</span>
                  </>
                ) : loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Account & Securing Profile...</span>
                  </>
                ) : !captchaToken ? (
                  <span>Complete Security Verification to Continue</span>
                ) : isCheckoutIntent ? (
                  <>
                    <span>Create Account & Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    <span>Create Professional Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: SIGN IN (LOGIN) FORM                              */}
          {/* ======================================================== */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fadeIn">
              {/* Email Address */}
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isSuccess}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer group"
              >
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>{isCheckoutIntent ? "Verified! Taking you to Checkout..." : "Success! Redirecting to Dashboard..."}</span>
                  </>
                ) : loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : isCheckoutIntent ? (
                  <>
                    <span>Sign In & Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Footer Switcher Reminder */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
            <span>
              {activeTab === "register" ? "Already have an account?" : "Don't have an account yet?"}
            </span>
            <button
              type="button"
              onClick={() => handleSwitchTab(activeTab === "register" ? "login" : "register")}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{activeTab === "register" ? "Sign In Here" : "Create Account Here"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
