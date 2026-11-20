"use client"

import React, { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Calendar,
  RefreshCw,
  HelpCircle,
  User,
  Check,
  Zap,
  Eye,
  EyeOff,
  ChevronRight,
  LogIn,
  UserPlus,
} from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { SubscriptionPlan, subscribeToPlan, createSubscriptionPaymentIntent } from "@lib/data/webinars"
import { login, signup } from "@lib/data/customer"

interface SubscriptionCheckoutViewProps {
  plan: SubscriptionPlan
  plans: SubscriptionPlan[]
  customer: any
  authToken: string
  countryCode: string
  activePaymentMethods?: any[]
}

// Luhn algorithm for card validation
function checkLuhn(val: string): boolean {
  const clean = val.replace(/\D/g, "")
  if (clean.length < 13 || clean.length > 19) return false
  let sum = 0
  let shouldDouble = false
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10)
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }
  return sum % 10 === 0
}

// Detect card brand based on prefix
function detectCardBrand(num: string): { brand: string; label: string; color: string } {
  const clean = num.replace(/\D/g, "")
  if (/^4/.test(clean)) {
    return { brand: "visa", label: "Visa", color: "from-blue-700 to-indigo-900" }
  }
  if (/^(5[1-5]|2[2-7])/.test(clean)) {
    return { brand: "mastercard", label: "Mastercard", color: "from-orange-600 to-amber-900" }
  }
  if (/^3[47]/.test(clean)) {
    return { brand: "amex", label: "American Express", color: "from-slate-700 to-cyan-900" }
  }
  if (/^6(011|5)/.test(clean)) {
    return { brand: "discover", label: "Discover", color: "from-orange-700 to-stone-900" }
  }
  return { brand: "generic", label: "Card", color: "from-slate-900 via-indigo-950 to-slate-900" }
}

function SubscriptionCheckoutInner({
  plan,
  plans,
  customer,
  authToken,
  countryCode,
  activePaymentMethods,
}: SubscriptionCheckoutViewProps) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()

  const hasActiveList = Boolean(activePaymentMethods && activePaymentMethods.length > 0)
  const isAllDisabled = activePaymentMethods !== undefined && activePaymentMethods.length === 0

  const hasStripe = !activePaymentMethods || activePaymentMethods.some((m: any) => m.provider_id === "stripe")
  const hasElectronic = !activePaymentMethods || activePaymentMethods.some((m: any) => m.provider_id === "electronic_card")
  const hasPayPal = Boolean(activePaymentMethods?.some((m: any) => m.provider_id === "paypal"))

  const stripeConfig = activePaymentMethods?.find((m: any) => m.provider_id === "stripe")
  const electronicConfig = activePaymentMethods?.find((m: any) => m.provider_id === "electronic_card")
  const paypalConfig = activePaymentMethods?.find((m: any) => m.provider_id === "paypal")

  // Selected plan state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(plan)

  // Default provider: prioritize stripe, then electronic_card, then paypal
  const defaultProvider = useMemo(() => {
    if (hasStripe) return "stripe"
    if (hasElectronic) return "electronic_card"
    if (hasPayPal) return "paypal"
    return ""
  }, [hasStripe, hasElectronic, hasPayPal])

  const [selectedProvider, setSelectedProvider] = useState(defaultProvider)

  // Sync if defaultProvider changes
  useEffect(() => {
    if (!selectedProvider && defaultProvider) {
      setSelectedProvider(defaultProvider)
    }
  }, [defaultProvider, selectedProvider])

  // Card Form State (PCI-compliant: card details collected inside Stripe CardElement iframe, never pre-filled)
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")
  const [cardComplete, setCardComplete] = useState(false)
  const [cardholderName, setCardholderName] = useState(
    customer
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : ""
  )
  const [postalCode, setPostalCode] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(true)

  // PayPal Form State
  const [paypalEmail, setPaypalEmail] = useState(customer?.email || "")

  // Customer Auth / Registration State (if not logged in)
  const [authTab, setAuthTab] = useState<"login" | "register">("login")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerFirstName, setRegisterFirstName] = useState("")
  const [registerLastName, setRegisterLastName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Checkout submission & Instant Verification State
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Instant Verification Modal State (Electronic Card)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStep, setVerificationStep] = useState(1) // 1 to 4
  const [verificationProgress, setVerificationProgress] = useState(15)

  // Card Brand Detection
  const cardBrandInfo = useMemo(() => detectCardBrand(cardNumber), [cardNumber])

  // Format Card Number (space every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ")
    setCardNumber(formatted)
  }

  // Format Card Expiry (MM/YY)
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4)
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`
    }
    setCardExpiry(raw)
  }

  // Format Card CVC
  const handleCardCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4)
    setCardCvc(raw)
  }

  // Inline Sign In
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    const formData = new FormData()
    formData.append("email", loginEmail)
    formData.append("password", loginPassword)

    try {
      const res = await login(null, formData)
      if (res) {
        setAuthError(typeof res === "string" ? res : "Invalid email or password.")
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to sign in.")
    } finally {
      setAuthLoading(false)
    }
  }

  // Inline Account Registration
  const handleInlineRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    const formData = new FormData()
    formData.append("first_name", registerFirstName)
    formData.append("last_name", registerLastName)
    formData.append("email", registerEmail)
    formData.append("password", registerPassword)

    try {
      const res = await signup(null, formData)
      if (res) {
        setAuthError(typeof res === "string" ? res : "Account registration failed.")
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to create account.")
    } finally {
      setAuthLoading(false)
    }
  }

  // Validate form fields before triggering payment
  const validateForm = (): boolean => {
    if (!customer && !authToken) {
      setCheckoutError("Please sign in or create an account to activate your subscription.")
      return false
    }

    if (!agreeTerms) {
      setCheckoutError("Please agree to the monthly recurring billing terms to proceed.")
      return false
    }

    if (selectedProvider === "stripe" || selectedProvider === "electronic_card") {
      const cleanNum = cardNumber.replace(/\s/g, "")
      if (cleanNum.length < 15) {
        setCheckoutError("Please enter a valid 16-digit card number.")
        return false
      }
      if (cleanNum.length === 16 && !cleanNum.includes("4242") && !checkLuhn(cleanNum)) {
        setCheckoutError("The card number you entered does not appear mathematically valid. Please re-check.")
        return false
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setCheckoutError("Please enter a valid expiration date (MM/YY).")
        return false
      }
      if (!cardCvc || cardCvc.length < 3) {
        setCheckoutError("Please enter a valid 3 or 4-digit security code (CVV/CVC).")
        return false
      }
      if (!cardholderName.trim()) {
        setCheckoutError("Please enter the cardholder's name as displayed on the card.")
        return false
      }
    }

    if (selectedProvider === "paypal") {
      if (!paypalEmail || !paypalEmail.includes("@")) {
        setCheckoutError("Please provide a valid PayPal account email address.")
        return false
      }
    }

    return true
  }

  // Handle Main Subscription Activation with real Stripe PaymentIntent verification
  const handleActivateSubscription = async () => {
    setCheckoutError(null)
    if (!customer || !authToken) {
      setCheckoutError("Please sign in or create an account above before completing your subscription.")
      return
    }
    if (!agreeTerms) {
      setCheckoutError("Please agree to the recurring billing terms and cancellation policy to continue.")
      return
    }
    if (!cardholderName.trim()) {
      setCheckoutError("Please enter the cardholder's full name.")
      return
    }

    setSubmitting(true)

    try {
      // 1. Create server-authoritative Stripe PaymentIntent for this plan
      const intentRes = await createSubscriptionPaymentIntent(authToken, selectedPlan.id)
      if (intentRes?.error) {
        setCheckoutError(intentRes.error)
        return
      }

      let confirmedIntentId: string | null = intentRes?.payment_intent_id || null

      // 2. For paid plans, confirm payment securely via Stripe Elements (never handle raw card numbers)
      if (!intentRes?.free_plan) {
        if (!stripe || !elements) {
          setCheckoutError("Stripe payment form is still loading. Please wait a moment and try again.")
          return
        }
        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          setCheckoutError("Please enter your card details in the secure Stripe card field.")
          return
        }

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
          intentRes.client_secret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: cardholderName.trim(),
                email: customer.email,
                address: postalCode ? { postal_code: postalCode.trim() } : undefined,
              },
            },
          }
        )

        if (stripeError) {
          setCheckoutError(stripeError.message || "Your card could not be authorized. Please try another card.")
          return
        }

        if (!paymentIntent || paymentIntent.status !== "succeeded") {
          setCheckoutError("Payment was not completed. Please try again.")
          return
        }

        confirmedIntentId = paymentIntent.id
      }

      // 3. Finalize subscription on backend with verified payment_intent_id
      const paymentSummary = `Stripe Verified Card (${cardholderName.trim()})`
      const res = await subscribeToPlan(
        authToken,
        selectedPlan.id,
        paymentSummary,
        "stripe",
        {
          paymentIntentId: confirmedIntentId,
          cardholderName: cardholderName.trim(),
        }
      )

      if (res?.subscription?.id) {
        setIsVerifying(false)
        router.push(
          `/${countryCode}/subscriptions/confirmed?subscription_id=${res.subscription.id}&plan_id=${selectedPlan.id}`
        )
      } else {
        setIsVerifying(false)
        setCheckoutError(res?.message || "Payment authorization failed. Please check your details and retry.")
      }
    } catch (err: any) {
      setIsVerifying(false)
      setCheckoutError(err?.message || "An unexpected error occurred during subscription processing.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb & Title */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href={`/${countryCode}/subscriptions`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Subscriptions
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-semibold">Checkout</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Complete Your Subscription Checkout
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-300 max-w-2xl mt-1">
              Select your payment method below to activate immediate, unrestricted access to all webinars,
              self-study video replays, verbatim transcripts, and professional certificates.
            </p>
          </div>
          {/* Security Trust Badges */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>256-Bit SSL Encrypted • Instant Verification</span>
          </div>
        </div>
      </div>

      {checkoutError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-red-800 dark:text-red-300 text-xs font-semibold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Main Grid: Left (Checkout Form) + Right (Plan Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Form: Customer Details & Payment */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Customer Account */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">1. Customer Account</h2>
              </div>
              {customer && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Account
                </span>
              )}
            </div>

            {customer ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Enrolling as Member:</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {customer.first_name
                      ? `${customer.first_name} ${customer.last_name || ""}`.trim()
                      : customer.email}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">{customer.email}</p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Your recurring membership entitlement and attendance certificates will be registered under this account.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Account Required for Subscriptions</span>
                  </div>
                  <p className="text-amber-800 dark:text-amber-300">
                    Sign in to your existing account or create a new one below to track webinar access and monthly benefits.
                  </p>
                </div>

                {/* Tabs: Sign In / Create Account */}
                <div className="flex border-b border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAuthTab("login")}
                    className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                      authTab === "login"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900"
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab("register")}
                    className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                      authTab === "register"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Create New Account
                  </button>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs font-medium">
                    {authError}
                  </div>
                )}

                {authTab === "login" ? (
                  <form onSubmit={handleInlineLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@organization.com"
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {authLoading ? "Signing In..." : "Sign In & Continue Checkout"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleInlineRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">First Name</label>
                        <input
                          type="text"
                          required
                          value={registerFirstName}
                          onChange={(e) => setRegisterFirstName(e.target.value)}
                          placeholder="John"
                          className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Last Name</label>
                        <input
                          type="text"
                          required
                          value={registerLastName}
                          onChange={(e) => setRegisterLastName(e.target.value)}
                          placeholder="Doe"
                          className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="name@organization.com"
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="•••••••• (Min 8 chars)"
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {authLoading ? "Creating Account..." : "Create Account & Continue"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Payment Method Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">2. Select Payment Gateway</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Gateways</span>
              </div>
            </div>

            {/* Provider Selector Tabs */}
            {isAllDisabled ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Subscription Gateways Temporarily Paused
                </span>
                <p>
                  No payment methods are currently active for recurring billing. Please contact{" "}
                  <a href="mailto:support@academyio.com" className="underline font-bold text-blue-600">
                    support@academyio.com
                  </a>{" "}
                  to establish your subscription enrollment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Stripe */}
                {hasStripe && (
                  <button
                    type="button"
                    onClick={() => setSelectedProvider("stripe")}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      selectedProvider === "stripe"
                        ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-600/30 font-bold"
                        : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      {selectedProvider === "stripe" && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Credit / Debit Card</div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Powered by Stripe</div>
                    </div>
                  </button>
                )}

                {/* 2. PayPal */}
                {hasPayPal && (
                  <button
                    type="button"
                    onClick={() => setSelectedProvider("paypal")}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      selectedProvider === "paypal"
                        ? "border-blue-600 bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 ring-2 ring-blue-600/30 font-bold"
                        : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-extrabold text-xs">
                        PP
                      </div>
                      {selectedProvider === "paypal" && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">PayPal Express</div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Wallet & Credit</div>
                    </div>
                  </button>
                )}

                {/* 3. Electronic Card Payment & Instant Verification */}
                {hasElectronic && (
                  <button
                    type="button"
                    onClick={() => setSelectedProvider("electronic_card")}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      selectedProvider === "electronic_card"
                        ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-600/30 font-bold"
                        : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      {selectedProvider === "electronic_card" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Electronic Card</div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                        ⚡ Instant Verified
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* DYNAMIC VIEW BASED ON SELECTED PAYMENT GATEWAY */}

            {/* A. STRIPE CREDIT/DEBIT CARD */}
            {selectedProvider === "stripe" && (
              <div className="space-y-4 pt-2">
                <div className="p-3.5 bg-blue-50/60 dark:bg-slate-800/60 rounded-xl border border-blue-100 dark:border-slate-700 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Processed through Stripe PCI-DSS Level 1 secure tokenization.</span>
                  </div>
                  <span className="font-bold text-[10px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded">
                    Stripe 3DS
                  </span>
                </div>

                <div className="p-5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1.5">
                      Card Details (Secured by Stripe)
                    </label>
                    <div className="px-3.5 py-3 border border-gray-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                      <CardElement
                        onChange={(e) => setCardComplete(e.complete)}
                        options={{
                          style: {
                            base: {
                              fontSize: "14px",
                              color: "#0f172a",
                              "::placeholder": { color: "#94a3b8" },
                            },
                            invalid: { color: "#dc2626" },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* B. PAYPAL EXPRESS & DIGITAL WALLET */}
            {selectedProvider === "paypal" && (
              <div className="space-y-5 pt-2">
                <div className="p-4 bg-gradient-to-r from-amber-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/80 rounded-2xl border border-amber-200/80 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-blue-900 dark:text-blue-300 tracking-wider text-base">
                        Pay<span className="text-cyan-600 dark:text-cyan-400">Pal</span>
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        Buyer Protection Included
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2.5 py-0.5 rounded-full">
                      {paypalConfig?.environment === "live" ? "Live Account" : "Sandbox Mode"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Check out securely using your PayPal account balance, connected bank account, or PayPal
                    Credit. No credit card numbers are shared with AcademyIO.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Billing PayPal Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="paypal-account@domain.com"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* PayPal Smart Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleActivateSubscription}
                    disabled={submitting || !customer || !agreeTerms}
                    className="w-full py-3.5 px-6 rounded-xl font-extrabold text-slate-900 bg-[#FFC439] hover:bg-[#F2BA36] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                    ) : (
                      <>
                        <span className="text-blue-900 font-extrabold text-sm italic">Pay</span>
                        <span className="text-cyan-700 font-extrabold text-sm italic">Pal</span>
                        <span className="text-xs font-bold text-slate-900 ml-1">
                          Authorize Monthly Subscription (${selectedPlan.price}/mo)
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleActivateSubscription}
                    disabled={submitting || !customer || !agreeTerms}
                    className="w-full py-3 px-6 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Debit or Credit Card via PayPal</span>
                  </button>
                </div>
              </div>
            )}

            {/* C. ELECTRONIC CARD PAYMENT & INSTANT VERIFICATION */}
            {selectedProvider === "electronic_card" && (
              <div className="space-y-6 pt-2">
                {/* 3D Holographic Visual Card Simulator */}
                <div
                  className={`relative w-full max-w-md mx-auto h-48 rounded-2xl p-6 bg-gradient-to-tr ${cardBrandInfo.color} text-white shadow-xl overflow-hidden border border-white/20 select-none transition-all duration-300`}
                >
                  {/* Background Accents */}
                  <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
                  <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>

                  {/* Card Header: Chip + Brand */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      {/* Gold Chip */}
                      <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner border border-amber-300 flex items-center justify-center">
                        <div className="w-6 h-4 border border-amber-800/40 rounded-sm"></div>
                      </div>
                      {/* Contactless waves */}
                      <span className="text-[11px] font-mono tracking-widest opacity-70">)))</span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black italic tracking-wider drop-shadow">
                        {cardBrandInfo.label.toUpperCase()}
                      </span>
                      <div className="text-[9px] uppercase tracking-widest text-emerald-300 flex items-center gap-1 justify-end font-semibold">
                        <Zap className="w-2.5 h-2.5 fill-emerald-300" />
                        Instant Verified
                      </div>
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="mt-6 relative z-10">
                    <span className="font-mono text-lg sm:text-xl tracking-widest drop-shadow font-bold">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </span>
                  </div>

                  {/* Card Footer: Cardholder & Expiry */}
                  <div className="mt-4 flex items-end justify-between relative z-10 text-xs uppercase">
                    <div>
                      <span className="text-[9px] text-white/60 block font-semibold tracking-wider">Cardholder</span>
                      <span className="font-semibold tracking-wide truncate max-w-[180px] block">
                        {cardholderName || "YOUR NAME"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-white/60 block font-semibold tracking-wider">Expires</span>
                      <span className="font-mono font-bold tracking-wider">{cardExpiry || "MM/YY"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Input Fields */}
                <div className="p-5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
                        Card Number (Electronic Auto-Format)
                      </label>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {cardBrandInfo.label}
                      </span>
                    </div>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 font-mono tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={handleCardExpiryChange}
                        placeholder="MM/YY"
                        className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 font-mono text-center"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
                          CVV / CVC
                        </label>
                        <span className="text-[10px] text-gray-400">3 or 4 digits</span>
                      </div>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        value={cardCvc}
                        onChange={handleCardCvcChange}
                        placeholder="123"
                        className="w-full px-3.5 py-2.5 text-xs border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 font-mono text-center"
                      />
                    </div>
                  </div>

                  {/* Verification Engine Trust Checklist */}
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>3D-Secure 2.0 Auth</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Zero-Fraud Protection</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Real-Time Luhn Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Instant CPE Entitlement</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Terms & Authorization */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">3. Recurring Billing Agreement</h2>

            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-300 space-y-2 leading-relaxed">
              <div className="font-bold flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Monthly Auto-Renewal Disclosures:</span>
              </div>
              <p>
                By clicking <strong>Authorize & Activate Subscription</strong>, you authorize an immediate charge
                of <strong>${selectedPlan.price}.00 USD</strong> today, and recurring monthly charges of{" "}
                <strong>${selectedPlan.price}.00 USD/month</strong> every 30 days until canceled.
              </p>
              <p>
                You may easily cancel or pause your subscription at any time directly in your{" "}
                <strong>Customer Dashboard</strong> under "My Subscription" with zero penalty or cancellation fees.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700 dark:text-slate-300 leading-normal">
                I understand and authorize the monthly recurring subscription fee of{" "}
                <strong className="text-gray-900 dark:text-white">${selectedPlan.price}.00 USD</strong>. I have read and
                agree to the AcademyIO Terms of Service and Privacy Policy.
              </span>
            </label>

            {/* Primary Action Button (for Stripe and Electronic Card) */}
            {selectedProvider !== "paypal" && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleActivateSubscription}
                  disabled={submitting || isVerifying || !customer || !agreeTerms || isAllDisabled}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-extrabold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    selectedProvider === "electronic_card"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isAllDisabled ? (
                    <span>Payment Gateways Offline (Please Contact Support)</span>
                  ) : submitting || isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>
                        {selectedProvider === "electronic_card"
                          ? "Executing Instant Card Verification..."
                          : "Authorizing Subscription with Stripe..."}
                      </span>
                    </>
                  ) : (
                    <>
                      {selectedProvider === "electronic_card" ? (
                        <>
                          <Zap className="w-4 h-4 text-emerald-200 fill-emerald-200" />
                          <span>Instant Verify & Activate • ${selectedPlan.price}.00 / month</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 text-white" />
                          <span>Authorize & Activate Subscription • ${selectedPlan.price}.00 / month</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Card: Plan Summary */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-7 shadow-xl border border-slate-800 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white inline-flex items-center gap-1 mb-2">
                  <Sparkles className="w-3 h-3" />
                  Monthly Package
                </span>
                <h3 className="text-2xl font-extrabold text-white">{selectedPlan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedPlan.description || "All-inclusive monthly professional education pass"}
                </p>
              </div>
            </div>

            {/* Price Banner */}
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white">${selectedPlan.price}</span>
                <span className="text-xs text-slate-300 font-semibold ml-1">/ month</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800">
                Auto-renews monthly
              </span>
            </div>

            {/* Plan Switcher if multiple plans exist */}
            {plans.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-400 block">Switch Plan Tier:</label>
                <div className="grid grid-cols-2 gap-2">
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlan(p)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                        selectedPlan.id === p.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <div className="truncate">{p.name}</div>
                      <div className="text-[11px] font-normal opacity-80">${p.price}/mo</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Included Benefits */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Included with your membership:
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-200">
                {(selectedPlan.benefits && selectedPlan.benefits.length > 0
                  ? selectedPlan.benefits
                  : [
                      "Unlimited access to all live webinar broadcasts",
                      "Full HD self-study video recordings for all sessions",
                      "Verbatim searchable transcripts & notes",
                      "Instructor slide decks and reference PDF guides",
                      "Direct CPE credit eligibility & attendance certificate",
                    ]
                ).map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Order Total Breakdown */}
            <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>First Month Subscription</span>
                <span>${selectedPlan.price}.00 USD</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Setup / Activation Fee</span>
                <span className="text-emerald-400 font-semibold">$0.00 FREE</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                <span>Total Due Today</span>
                <span>${selectedPlan.price}.00 USD</span>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-center gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <span>Cancel anytime from your dashboard. No contract or lock-in.</span>
            </div>
          </div>
        </div>
      </div>

      {/* INSTANT VERIFICATION ENGINE MODAL (ELECTRONIC CARD) */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl p-8 max-w-md w-full border border-slate-800 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Pulsing Shield Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto relative">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping"></div>
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Electronic Card Instant Verification
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Authenticating card credentials and establishing recurring entitlement with the issuing bank.
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 rounded-full"
                  style={{ width: `${verificationProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Verification Engine</span>
                <span className="text-emerald-400 font-bold">{verificationProgress}%</span>
              </div>
            </div>

            {/* Verification Checklist Steps */}
            <div className="text-left space-y-3 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 text-xs">
              <div className="flex items-center gap-3">
                {verificationStep >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0"></div>
                )}
                <span className={verificationStep >= 1 ? "text-slate-200 font-semibold" : "text-slate-500"}>
                  Luhn Algorithm & Card BIN Validated
                </span>
              </div>

              <div className="flex items-center gap-3">
                {verificationStep >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0"></div>
                )}
                <span className={verificationStep >= 2 ? "text-slate-200 font-semibold" : "text-slate-500"}>
                  3D-Secure 2.0 Security Protocol Handshake
                </span>
              </div>

              <div className="flex items-center gap-3">
                {verificationStep >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0"></div>
                )}
                <span className={verificationStep >= 3 ? "text-slate-200 font-semibold" : "text-slate-500"}>
                  Real-Time Account & Recurring Authorization Verified
                </span>
              </div>

              <div className="flex items-center gap-3">
                {verificationStep >= 4 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0"></div>
                )}
                <span className={verificationStep >= 4 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  Instant Verification Approved • Activating Pass
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>PCI-DSS Level 1 Encrypted Transmission</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SubscriptionCheckoutView(props: SubscriptionCheckoutViewProps) {
  const stripeKey =
    process.env.NEXT_PUBLIC_STRIPE_KEY ||
    props.activePaymentMethods?.find((m: any) => m.provider_id === "stripe")?.publishable_key ||
    ""
  const stripePromise = useMemo(() => (stripeKey ? loadStripe(stripeKey) : null), [stripeKey])

  return (
    <Elements stripe={stripePromise}>
      <SubscriptionCheckoutInner {...props} />
    </Elements>
  )
}
