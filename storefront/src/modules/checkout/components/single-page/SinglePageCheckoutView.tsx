"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  Phone,
  Building2,
  CreditCard,
  Tag,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText,
  Calendar,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Trash2,
  RefreshCw,
  Plus,
  Minus,
  Loader2,
  UserPlus,
} from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import {
  placeOrder,
  applyPromotions,
  initiatePaymentSession,
  updateCart,
  updateLineItem,
  deleteLineItem,
  retrieveCart,
} from "@lib/data/cart"
import { updateCustomerProfile } from "@lib/data/customer"
import { isStripeLike, isPaypal, paymentInfoMap } from "@lib/constants"
import StripeCardField from "./StripeCardField"

interface SinglePageCheckoutViewProps {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer
  availablePaymentMethods: any[]
  countryCode: string
  webinars: any[]
}

export default function SinglePageCheckoutView({
  cart: initialCart,
  customer,
  availablePaymentMethods,
  countryCode,
  webinars = [],
}: SinglePageCheckoutViewProps) {
  const router = useRouter()
  const stripeConfirmFnRef = React.useRef<
    ((clientSecret: string, billingDetails: any) => Promise<any>) | null
  >(null)

  const [cart, setCart] = useState<HttpTypes.StoreCart>(initialCart)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(() => {
    const active = initialCart.payment_collection?.payment_sessions?.find(
      (s: any) => s.status === "pending" || s.status === "authorized"
    )
    if (active?.provider_id) return active.provider_id
    const stripeMethod = availablePaymentMethods?.find((m: any) => isStripeLike(m.id))
    return stripeMethod?.id || availablePaymentMethods?.[0]?.id || "pp_stripe_stripe"
  })

  // Stripe Session State Tracking
  const stripeSession = cart.payment_collection?.payment_sessions?.find(
    (s: any) => isStripeLike(s.provider_id) && Boolean(s.data?.client_secret)
  )
  const stripeClientSecret = (stripeSession?.data?.client_secret as string) || null

  const [isInitiatingStripe, setIsInitiatingStripe] = useState(false)
  const [stripeInitError, setStripeInitError] = useState<string | null>(null)

  // Customer & Registration-aligned Billing details state
  const initialFullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    `${initialCart.billing_address?.first_name || ""} ${initialCart.billing_address?.last_name || ""}`.trim()

  const [billingForm, setBillingForm] = useState({
    fullName: initialFullName || "Valued Professional",
    email: initialCart.email || customer.email || "",
    phone: initialCart.billing_address?.phone || customer.phone || "",
    company: initialCart.billing_address?.company || customer.company_name || (customer as any)?.metadata?.company_name || (customer as any)?.metadata?.company || "",
    ptin: (customer as any)?.metadata?.ptin || "",
    cfpId: (customer as any)?.metadata?.cfp_id || "",
    additionalAttendees: ((initialCart as any)?.metadata?.additional_attendees as string) || "",
  })

  const [showEditBilling, setShowEditBilling] = useState(false)
  const [ptinError, setPtinError] = useState<string | null>(null)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoFeedback, setPromoFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Order submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Quantity updating and item removal loading state
  const [updatingLineId, setUpdatingLineId] = useState<string | null>(null)

  // Sync state if initialCart updates from server refresh
  useEffect(() => {
    if (initialCart) {
      setCart(initialCart)
    }
  }, [initialCart])

  // Automatic redirect if cart becomes empty
  useEffect(() => {
    if (!cart?.items || cart.items.length === 0) {
      router.push(`/${countryCode}/webinars/upcoming`)
    }
  }, [cart?.items?.length, countryCode, router])

  // Automatically ensure Stripe session has a valid client_secret when Stripe is selected
  const ensureStripePaymentSession = async (currentCart: HttpTypes.StoreCart) => {
    const existing = currentCart.payment_collection?.payment_sessions?.find(
      (s: any) => isStripeLike(s.provider_id) && Boolean(s.data?.client_secret)
    )
    if (existing?.data?.client_secret) return

    setIsInitiatingStripe(true)
    setStripeInitError(null)
    try {
      await initiatePaymentSession(currentCart, { provider_id: "pp_stripe_stripe" })
      const refreshed = await retrieveCart()
      if (refreshed) {
        setCart(refreshed)
      }
    } catch (err: any) {
      console.warn("Notice: could not auto-initiate Stripe session:", err?.message)
      setStripeInitError("Could not initialize Stripe card gateway. Please try clicking the card option again.")
    } finally {
      setIsInitiatingStripe(false)
    }
  }

  useEffect(() => {
    if (isStripeLike(selectedPaymentMethod)) {
      const existing = cart.payment_collection?.payment_sessions?.find(
        (s: any) => isStripeLike(s.provider_id) && Boolean(s.data?.client_secret)
      )
      if (!existing && !isInitiatingStripe) {
        ensureStripePaymentSession(cart)
      }
    }
  }, [selectedPaymentMethod, cart.payment_collection?.payment_sessions?.length])

  // Handle quantity modification (stepper +/-) with instant optimistic update
  const handleUpdateQuantity = async (lineId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta
    if (newQty <= 0) {
      await handleRemoveLineItem(lineId)
      return
    }

    setUpdatingLineId(lineId)
    setSubmitError(null)

    // 1. Instant optimistic update in React state for immediate response
    setCart((prev) => {
      if (!prev || !prev.items) return prev
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === lineId ? { ...i, quantity: newQty } : i
        ),
      }
    })

    try {
      // 2. High-speed single server action
      const refreshed = await updateLineItem({ lineId, quantity: newQty })
      if (!refreshed || !refreshed.items || refreshed.items.length === 0) {
        setCart((prev) => ({ ...prev, items: [] }))
        router.push(`/${countryCode}/webinars/upcoming`)
        return
      }
      setCart(refreshed)
    } catch (err: any) {
      console.error("Failed to update item quantity:", err)
      setSubmitError(err?.message || "Failed to update item quantity. Please try again.")
      // Revert if error
      const current = await retrieveCart()
      if (current) setCart(current)
    } finally {
      setUpdatingLineId(null)
    }
  }

  // Handle removing a webinar line item with instant optimistic update
  const handleRemoveLineItem = async (lineId: string) => {
    setUpdatingLineId(lineId)
    setSubmitError(null)

    // 1. Instant optimistic removal in React state
    setCart((prev) => {
      if (!prev || !prev.items) return prev
      return {
        ...prev,
        items: prev.items.filter((i) => i.id !== lineId),
      }
    })

    try {
      // 2. High-speed single server action
      const refreshed = await deleteLineItem(lineId)
      if (!refreshed || !refreshed.items || refreshed.items.length === 0) {
        setCart((prev) => ({ ...prev, items: [] }))
        router.push(`/${countryCode}/webinars/upcoming`)
        return
      }
      setCart(refreshed)
    } catch (err: any) {
      console.error("Failed to remove item:", err)
      setSubmitError(err?.message || "Failed to remove item from order. Please try again.")
      // Revert if error
      const current = await retrieveCart()
      if (current) setCart(current)
    } finally {
      setUpdatingLineId(null)
    }
  }

  // Update payment session if payment method changes
  const handlePaymentMethodSelect = async (methodId: string) => {
    setSelectedPaymentMethod(methodId)
    setSubmitError(null)

    if (isStripeLike(methodId)) {
      const existing = cart.payment_collection?.payment_sessions?.find(
        (s: any) => isStripeLike(s.provider_id) && Boolean(s.data?.client_secret)
      )
      if (!existing) {
        setIsInitiatingStripe(true)
      }
    }

    try {
      await initiatePaymentSession(cart, { provider_id: methodId })
      const refreshed = await retrieveCart()
      if (refreshed) {
        setCart(refreshed)
      }
    } catch (e: any) {
      console.warn("Notice: payment session update:", e?.message)
    } finally {
      setIsInitiatingStripe(false)
    }
  }

  // Handle promo code application
  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promoCodeInput.trim()) return

    setPromoLoading(true)
    setPromoFeedback(null)

    try {
      const activeCodes = (cart as any).promotions?.map((p: any) => p.code).filter(Boolean) || []
      const newCodes = Array.from(new Set([...activeCodes, promoCodeInput.trim()]))
      await applyPromotions(newCodes)
      setPromoFeedback({ type: "success", text: `Promotion code "${promoCodeInput.trim()}" applied!` })
      setPromoCodeInput("")
      const refreshed = await retrieveCart()
      if (refreshed) setCart(refreshed)
    } catch (err: any) {
      setPromoFeedback({ type: "error", text: err?.message || "Invalid or expired promotion code." })
    } finally {
      setPromoLoading(false)
    }
  }

  // Handle promo code removal
  const handleRemovePromo = async (codeToRemove: string) => {
    setPromoLoading(true)
    try {
      const remainingCodes = ((cart as any).promotions?.map((p: any) => p.code) || []).filter(
        (c: string) => c !== codeToRemove
      )
      await applyPromotions(remainingCodes)
      setPromoFeedback({ type: "success", text: `Promotion code removed.` })
      const refreshed = await retrieveCart()
      if (refreshed) setCart(refreshed)
    } catch (err: any) {
      setPromoFeedback({ type: "error", text: err?.message || "Failed to remove discount." })
    } finally {
      setPromoLoading(false)
    }
  }

  // Sync & Save Billing & Professional Details (matching registration page)
  const handleSaveBillingDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setPtinError(null)

    const trimmedPtin = (billingForm.ptin || "").trim().toUpperCase()
    if (trimmedPtin) {
      if (!/^P\d{8}$/.test(trimmedPtin)) {
        setPtinError("PTIN# is invalid. Must start with 'P' followed by 8 digits (no spaces), e.g., P12345678.")
        return false
      }
    }

    setIsSavingDetails(true)
    try {
      const nameParts = (billingForm.fullName || "").trim().split(/\s+/)
      const firstName = nameParts[0] || "Valued"
      const lastName = nameParts.slice(1).join(" ") || "Professional"

      // 1. Sync Customer Profile in Backend
      const profileFormData = new FormData()
      profileFormData.append("first_name", firstName)
      profileFormData.append("last_name", lastName)
      profileFormData.append("phone", (billingForm.phone || "").trim())
      profileFormData.append("company_name", (billingForm.company || "").trim())
      profileFormData.append("ptin", trimmedPtin)
      profileFormData.append("cfp_id", (billingForm.cfpId || "").trim())
      await updateCustomerProfile(profileFormData)

      // 2. Sync Medusa Cart Billing Address & Metadata
      const updatedCart = await updateCart({
        email: (billingForm.email || "").trim(),
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          company: (billingForm.company || "").trim(),
          phone: (billingForm.phone || "").trim(),
          address_1: "Digital Delivery",
          city: "New York",
          province: "NY",
          postal_code: "10001",
          country_code: (countryCode || "us").toLowerCase(),
        },
        metadata: {
          ...((cart as any)?.metadata || {}),
          additional_attendees: (billingForm.additionalAttendees || "").trim(),
        },
      })

      if (updatedCart) {
        setCart(updatedCart)
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      setShowEditBilling(false)
      return true
    } catch (err: any) {
      console.warn("Failed to sync billing details:", err)
      return false
    } finally {
      setIsSavingDetails(false)
    }
  }

  // Auto-sync Additional Attendee Email on blur outside full edit mode
  const handleAttendeeBlur = async () => {
    const trimmed = (billingForm.additionalAttendees || "").trim()
    const existing = ((cart as any)?.metadata?.additional_attendees || "").trim()
    if (trimmed !== existing) {
      try {
        const updated = await updateCart({
          metadata: {
            ...((cart as any)?.metadata || {}),
            additional_attendees: trimmed,
          },
        })
        if (updated) {
          setCart(updated)
        }
      } catch (err) {
        console.warn("Failed to auto-save additional attendees:", err)
      }
    }
  }

  // Place Order submission
  const handlePlaceOrder = async () => {
    if (!acceptTerms) {
      setSubmitError("Please accept the Terms of Service and Cancellation Policy to complete your enrollment.")
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Sync billing details if editing
      if (showEditBilling) {
        const ok = await handleSaveBillingDetails()
        if (!ok && ptinError) {
          setIsSubmitting(false)
          return
        }
      } else {
        // Ensure attendee email is persisted to cart metadata before completing order
        const currentAttendeeMeta = (((cart as any)?.metadata?.additional_attendees || "") as string).trim()
        const currentAttendeeForm = (billingForm.additionalAttendees || "").trim()
        if (currentAttendeeMeta !== currentAttendeeForm) {
          try {
            await updateCart({
              metadata: {
                ...((cart as any)?.metadata || {}),
                additional_attendees: currentAttendeeForm,
              },
            })
          } catch (e) {
            console.warn("Auto sync attendee email error:", e)
          }
        }
      }

      // 2. If Stripe payment method is selected
      if (isStripeLike(selectedPaymentMethod)) {
        if (!stripeConfirmFnRef.current) {
          setSubmitError("Please enter your card number, expiration date, and CVC before completing enrollment.")
          setIsSubmitting(false)
          return
        }

        const session =
          cart.payment_collection?.payment_sessions?.find(
            (s: any) => isStripeLike(s.provider_id) && Boolean(s.data?.client_secret)
          )

        const clientSecret = session?.data?.client_secret as string | undefined
        if (!clientSecret) {
          setSubmitError("Payment session is initializing. Please wait a moment and click Complete Enrollment again.")
          setIsSubmitting(false)
          return
        }

        const name =
          billingForm.fullName ||
          `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
          "Valued Customer"

        const { error: stripeError, paymentIntent } =
          await stripeConfirmFnRef.current(clientSecret, {
            name,
            email: billingForm.email || customer.email,
            phone: billingForm.phone || customer.phone || undefined,
            address: {
              city: "New York",
              country: (countryCode || "us").toUpperCase(),
              line1: "Digital Delivery",
              postal_code: "10001",
              state: "NY",
            },
          })

        if (stripeError) {
          const pi = stripeError.payment_intent
          if (
            !pi ||
            (pi.status !== "requires_capture" && pi.status !== "succeeded")
          ) {
            setSubmitError(
              stripeError.message ||
                "Card payment confirmation failed. Please check your card details."
            )
            setIsSubmitting(false)
            return
          }
        }
      }

      // 3. Complete Order with Medusa Backend
      await placeOrder(cart.id)
    } catch (err: any) {
      console.error("Checkout order error:", err)
      setSubmitError(err?.message || "An unexpected error occurred while placing your order. Please try again.")
      setIsSubmitting(false)
    }
  }

  // Guard empty cart state and show smooth redirect UI
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Order Summary is Empty</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">
          Your order has no remaining webinars. Redirecting you to upcoming live webinars...
        </p>
        <Link
          href={`/${countryCode}/webinars/upcoming`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
        >
          Browse Upcoming Webinars
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  // Calculate pricing breakdown
  const currencyCode = (cart.currency_code || "usd").toUpperCase()
  const subtotal = cart.item_subtotal || cart.subtotal || 0
  const discountTotal = (cart as any).discount_subtotal || cart.discount_total || 0
  const shippingTotal = cart.shipping_subtotal || 0
  const taxTotal = cart.tax_total || 0
  const totalAmount = cart.total || 0

  const promotions = (cart as any).promotions || []
  const ptin = (customer as any)?.metadata?.ptin
  const cfpId = (customer as any)?.metadata?.cfp_id

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Breadcrumb & Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mb-2">
          <Link href={`/${countryCode}/webinars`} className="hover:text-blue-600 dark:hover:text-blue-400">
            Webinars
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-semibold">Single-Page Checkout</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Secure Webinar Checkout
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Verify your professional account details, review your learning materials, and finalize enrollment.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>256-Bit SSL Encrypted & Verified</span>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop, 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* ================= LEFT COLUMN: CHECKOUT DETAILS ================= */}
        <div className="lg:col-span-7 space-y-8">
          {/* SECTION 1: VERIFIED CUSTOMER IDENTITY */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">1. Authenticated Account Details</h2>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Registration credentials and CE certificates will be issued to this account.
                  </p>
                </div>
              </div>
              <Link
                href={`/${countryCode}/login?returnUrl=/${countryCode}/checkout`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Switch Account
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                  Registered Name
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 block">
                  {customer.first_name} {customer.last_name}
                </span>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                  Order Contact Email
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 block truncate">
                  {customer.email}
                </span>
              </div>

              {customer.company_name && (
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Firm / Organization
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-slate-200 mt-0.5 block">
                    {customer.company_name}
                  </span>
                </div>
              )}

              {customer.phone && (
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Phone Number
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-slate-200 mt-0.5 block font-mono">
                    {customer.phone}
                  </span>
                </div>
              )}
            </div>

            {/* Continuing Education Badges */}
            {(ptin || cfpId) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                {ptin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    IRS PTIN#: {ptin}
                  </span>
                )}
                {cfpId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    CFP ID#: {cfpId}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: BILLING & PROFESSIONAL DETAILS (ALIGNED WITH REGISTER PAGE) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">2. Billing & Professional Information</h2>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    Matches your professional registration details. Instant digital access (no physical shipping).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPtinError(null)
                  setShowEditBilling(!showEditBilling)
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {showEditBilling ? "Cancel" : "Edit Billing Details"}
              </button>
            </div>

            {/* Instant Digital Delivery Badge */}
            <div className="mt-4 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3 text-xs text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Instant Digital Access:</strong> Session streaming credentials, high-definition recordings, verbatim transcripts, and slide downloads become active in your dashboard immediately upon checkout.
              </span>
            </div>

            {saveSuccess && (
              <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Billing and professional registration details saved successfully!</span>
              </div>
            )}

            {/* Editable Billing Form (Matching Register Page) */}
            {showEditBilling ? (
              <form onSubmit={handleSaveBillingDetails} className="mt-4 space-y-3.5 pt-4 border-t border-gray-100 dark:border-slate-800">
                {ptinError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
                    {ptinError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={billingForm.fullName}
                      onChange={(e) => setBillingForm({ ...billingForm, fullName: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Billing Email */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Billing / Invoicing Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={billingForm.email}
                      onChange={(e) => setBillingForm({ ...billingForm, email: e.target.value })}
                      placeholder="jane.doe@firm.com"
                      className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Company / Firm Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Company / Firm Name
                    </label>
                    <input
                      type="text"
                      value={billingForm.company}
                      onChange={(e) => setBillingForm({ ...billingForm, company: e.target.value })}
                      placeholder="Company / Firm Name LLP"
                      className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={billingForm.phone}
                      onChange={(e) => setBillingForm({ ...billingForm, phone: e.target.value })}
                      placeholder="e.g. (555) 234-5678"
                      className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* PTIN# */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      PTIN# <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">(Enrolled Agents only)</span>
                    </label>
                    <input
                      type="text"
                      value={billingForm.ptin}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\s+/g, "").toUpperCase()
                        setBillingForm({ ...billingForm, ptin: cleaned })
                      }}
                      placeholder="P12345678"
                      maxLength={9}
                      className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                      Starts with a P followed by 8 digits (no spaces).
                    </p>
                  </div>

                  {/* CFP ID# */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-slate-300 mb-1">
                      CFP ID# <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">(CFP Holders only)</span>
                    </label>
                    <input
                      type="text"
                      value={billingForm.cfpId}
                      onChange={(e) => setBillingForm({ ...billingForm, cfpId: e.target.value.trim() })}
                      placeholder="e.g. 294810"
                      className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                      For CFP Designation holders only.
                    </p>
                  </div>

                  {/* Additional Attendee – Enter Email Id */}
                  <div className="sm:col-span-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <label className="block text-[11px] font-bold text-gray-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Additional Attendee – Enter Email Id</span>
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={billingForm.additionalAttendees}
                        onChange={(e) => setBillingForm({ ...billingForm, additionalAttendees: e.target.value })}
                        placeholder="e.g. colleague@firm.com (comma separated for multiple emails)"
                        className="w-full text-xs pl-9 p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                      Enrolling colleagues or team members? Enter their email IDs to deliver session credentials, course materials, and CE/CPE certificates directly to them.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditBilling(false)}
                    className="px-3 py-1.5 text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDetails}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingDetails ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </form>
            ) : (
              /* View-only summary of registration billing details */
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Billing Contact Name
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block">
                    {billingForm.fullName || "Not provided"}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Invoicing Email
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white mt-0.5 block truncate">
                    {billingForm.email}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Firm / Organization
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-slate-200 mt-0.5 block">
                    {billingForm.company || "Not provided"}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Contact Phone
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-slate-200 mt-0.5 block font-mono">
                    {billingForm.phone || "Not provided"}
                  </span>
                </div>

                {/* Badges for PTIN and CFP ID */}
                {(billingForm.ptin || billingForm.cfpId) && (
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-2 pt-1">
                    {billingForm.ptin && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        IRS PTIN#: {billingForm.ptin}
                      </span>
                    )}
                    {billingForm.cfpId && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        CFP ID#: {billingForm.cfpId}
                      </span>
                    )}
                  </div>
                )}

                {/* Additional Attendee – Enter Email Id */}
                <div className="sm:col-span-2 pt-3.5 mt-1 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Additional Attendee – Enter Email Id</span>
                      <span className="text-[10px] font-normal text-gray-400 dark:text-slate-500">(Optional)</span>
                    </label>
                    {billingForm.additionalAttendees && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Auto-saved to order
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
                    Enrolling colleagues or team members? Enter their email IDs to deliver session credentials, course materials, and CE/CPE certificates directly to them.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={billingForm.additionalAttendees}
                      onChange={(e) => setBillingForm({ ...billingForm, additionalAttendees: e.target.value })}
                      onBlur={handleAttendeeBlur}
                      placeholder="e.g. colleague@firm.com (comma separated for multiple emails)"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: PAYMENT METHOD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-slate-800 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">3. Payment Method</h2>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Select your preferred secure payment method.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {availablePaymentMethods && availablePaymentMethods.length > 0 ? (
                availablePaymentMethods.map((method) => {
                  const isSelected = selectedPaymentMethod === method.id
                  const isStripe = isStripeLike(method.id)
                  const isPay = isPaypal(method.id)

                  const displayTitle =
                    method.display_title ||
                    (method.id === "pp_system_default"
                      ? "Electronic Card Payment & Instant Verification"
                      : isStripe
                      ? "Credit / Debit Card (Stripe)"
                      : isPay
                      ? "PayPal Express & Digital Wallet"
                      : method.name || method.id)

                  const displayDesc =
                    method.description ||
                    (method.id === "pp_system_default"
                      ? "Direct instant processing with automated CPE entitlement activation."
                      : isStripe
                      ? "Visa, Mastercard, American Express, and Discover with 3D Secure verification."
                      : isPay
                      ? "Pay securely using your PayPal account balance or linked card."
                      : "Secure verified payment gateway.")

                  return (
                    <div
                      key={method.id}
                      onClick={() => handlePaymentMethodSelect(method.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 ring-1 ring-blue-600"
                          : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_method"
                            checked={isSelected}
                            onChange={() => handlePaymentMethodSelect(method.id)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white block">
                              {displayTitle}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {displayDesc}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-400">
                          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {isPay ? "PayPal Verified" : "Encrypted"}
                          </span>
                        </div>
                      </div>

                      {/* If Stripe is selected, render isolated Stripe Card Field */}
                      {isSelected && isStripe && (
                        <StripeCardField
                          clientSecret={stripeClientSecret}
                          isLoading={isInitiatingStripe}
                          error={stripeInitError}
                          onConfirmReady={(fn) => {
                            stripeConfirmFnRef.current = fn
                          }}
                        />
                      )}

                      {/* If PayPal is selected, render PayPal guidance notice */}
                      {isSelected && isPay && (
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>
                            You will be redirected to PayPal to securely authorize your purchase upon clicking Complete Enrollment.
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Payment Processing Temporarily Unavailable</span>
                  </div>
                  <p className="leading-relaxed">
                    Our payment processing gateways are currently undergoing routine maintenance or have been temporarily paused by the administrator. Please contact our support team at{" "}
                    <a
                      href="mailto:support@academyio.com"
                      className="font-bold underline text-blue-600 dark:text-blue-400"
                    >
                      support@academyio.com
                    </a>{" "}
                    for assisted registration and manual processing.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: DISCOUNT / PROMO CODE */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-slate-800 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">4. Coupon or Discount Code</h2>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Have an institutional discount, partner voucher, or season coupon?
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                placeholder="ENTER PROMO CODE"
                className="flex-1 px-3.5 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-mono uppercase tracking-wider text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="submit"
                disabled={promoLoading || !promoCodeInput.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {promoLoading ? "Applying..." : "Apply Code"}
              </button>
            </form>

            {promoFeedback && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs font-medium ${
                  promoFeedback.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                }`}
              >
                {promoFeedback.text}
              </div>
            )}

            {/* Active Promotions List */}
            {promotions && promotions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                  Active Discounts Applied:
                </span>
                {promotions.map((promo: any) => (
                  <div
                    key={promo.id || promo.code}
                    className="flex items-center justify-between p-2.5 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-bold font-mono text-purple-900 dark:text-purple-300">{promo.code}</span>
                      {promo.application_method?.value && (
                        <span className="text-[10px] text-purple-700 dark:text-purple-400">
                          ({promo.application_method.type === "percentage" ? `${promo.application_method.value}% off` : `$${promo.application_method.value} off`})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePromo(promo.code)}
                      className="text-purple-700 hover:text-red-600 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: TERMS & CONDITIONS CHECKBOX */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-gray-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
              />
              <span className="leading-relaxed">
                I understand that enrollment provides personalized continuing education access. I agree to the{" "}
                <Link href={`/${countryCode}/terms`} target="_blank" className="text-blue-600 dark:text-blue-400 underline font-semibold">
                  Terms of Service
                </Link>
                ,{" "}
                <Link href={`/${countryCode}/refund-policy`} target="_blank" className="text-blue-600 dark:text-blue-400 underline font-semibold">
                  Cancellation Policy
                </Link>
                , and acknowledge that all session materials are for the authorized professional registrant.
              </span>
            </label>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ORDER SUMMARY & PLACE ORDER ================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Order Summary</h2>
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                {cart.items?.length || 0} {cart.items?.length === 1 ? "Item" : "Items"}
              </span>
            </div>

            {/* Webinar Items Cards */}
            <div className="space-y-4 mb-6">
              {cart.items?.map((item) => {
                const matchedWebinar = webinars.find(
                  (w) =>
                    w.product_id === item.product_id ||
                    w.id === item.product_id ||
                    w.variants?.some((v: any) => v.id === item.variant_id)
                )

                const isLive = item.variant_title?.toLowerCase().includes("live") || (!matchedWebinar?.is_completed && matchedWebinar?.has_live)
                const eventDateFormatted = matchedWebinar?.event_date
                  ? new Date(matchedWebinar.event_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : null

                const isLineUpdating = updatingLineId === item.id

                return (
                  <div
                    key={item.id}
                    className={`p-4 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800 flex flex-col gap-3 transition-opacity ${
                      isLineUpdating ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Thumbnail */}
                      {item.thumbnail || matchedWebinar?.featured_image ? (
                        <img
                          src={item.thumbnail || matchedWebinar?.featured_image}
                          alt={item.title}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Video className="w-6 h-6" />
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                            {item.title}
                          </h3>
                          {/* Price */}
                          <div className="text-right whitespace-nowrap shrink-0">
                            <span className="text-sm font-bold text-gray-900 dark:text-white block">
                              {convertToLocale({
                                amount: item.total || ((item.unit_price || 0) * item.quantity),
                                currency_code: currencyCode,
                              })}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-[10px] text-gray-400 dark:text-slate-400 block">
                                {convertToLocale({ amount: item.unit_price || 0, currency_code: currencyCode })} each
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Instructor */}
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <span>Instructor:</span>
                          <strong className="text-gray-800 dark:text-slate-200 font-medium">
                            {matchedWebinar?.speaker_name || "AcademyIO Faculty"}
                          </strong>
                        </p>

                        {/* Format Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                            {item.variant_title || item.variant?.title || "Full Access"}
                          </span>

                          {matchedWebinar?.cpe_credits && matchedWebinar.cpe_credits > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                              {matchedWebinar.cpe_credits} CPE
                            </span>
                          )}
                        </div>

                        {/* Event Date or Self-Study */}
                        <div className="mt-1 text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1">
                          {eventDateFormatted ? (
                            <>
                              <Calendar className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                              <span>{eventDateFormatted}</span>
                              {matchedWebinar?.start_time && (
                                <span>• {matchedWebinar.start_time} {matchedWebinar?.timezone || ""}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">On-Demand Self-Study Access</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar: Quantity Stepper & Remove */}
                    <div className="pt-2.5 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
                          Quantity:
                        </span>
                        <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                            disabled={isLineUpdating}
                            title={item.quantity === 1 ? "Remove webinar" : "Decrease quantity"}
                            className="p-1 px-2.5 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 py-0.5 text-xs font-bold text-gray-900 dark:text-white min-w-[28px] text-center select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                            disabled={isLineUpdating}
                            title="Increase quantity"
                            className="p-1 px-2.5 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {isLineUpdating && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating...</span>
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        disabled={isLineUpdating}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Remove webinar from cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Financial Calculations */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2.5 text-xs text-gray-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {convertToLocale({ amount: subtotal, currency_code: currencyCode })}
                </span>
              </div>

              {discountTotal > 0 && (
                <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold">
                  <span>Discount Applied</span>
                  <span>- {convertToLocale({ amount: discountTotal, currency_code: currencyCode })}</span>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-base font-extrabold text-gray-900 dark:text-white">
                <span>Total Amount Due</span>
                <span className="text-xl text-blue-600 dark:text-blue-400">
                  {convertToLocale({ amount: totalAmount, currency_code: currencyCode })}
                </span>
              </div>
            </div>

            {/* Error Notification */}
            {submitError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Big Place Order Button */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={isSubmitting || !acceptTerms || !availablePaymentMethods || availablePaymentMethods.length === 0}
                onClick={handlePlaceOrder}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {!availablePaymentMethods || availablePaymentMethods.length === 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Payment Gateways Offline (Contact Support)</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing Payment & Enrollment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay Now & Complete Enrollment ({convertToLocale({ amount: totalAmount, currency_code: currencyCode })})</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-gray-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Immediate confirmation & access grant upon payment</span>
              </div>
            </div>

            {/* Trust Points */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800 space-y-2 text-[11px] text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Instant Webinar & Study Portal Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>IRS & CFP Approved Continuing Education Provider</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>100% Satisfaction & 24-Hour Cancellation Policy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
