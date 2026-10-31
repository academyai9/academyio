"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Video,
  FileText,
  Download,
  Sparkles,
  Check,
  ShoppingBag,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Clock,
} from "lucide-react"
import {
  WebinarItem,
  getWebinarSubscriptionStatus,
  registerWebinarWithSubscription,
} from "@lib/data/webinars"
import { addToCart, fastDirectEnroll } from "@lib/data/cart"

interface PurchaseOptionsProps {
  webinar: WebinarItem
  countryCode: string
  customer?: any | null
  initialSubscriptionStatus?: any | null
  authToken?: string
}

interface DisplayOption {
  variantId: string
  type: string
  title: string
  price: number
  currencyCode: string
  description?: string
  badge?: string
  includedItems: string[]
  isAvailable?: boolean
  unavailableReason?: string
}

export default function WebinarPurchaseOptions({
  webinar,
  countryCode,
  customer,
  initialSubscriptionStatus,
  authToken,
}: PurchaseOptionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)
  const [registering, setRegistering] = useState<boolean>(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showAlternativePurchases, setShowAlternativePurchases] = useState<boolean>(false)

  // Subscription status
  const [subStatus, setSubStatus] = useState<any | null>(initialSubscriptionStatus || null)

  const isCompleted = Boolean(webinar.is_completed)
  const isRecordingReady = Boolean(webinar.recording_ready || webinar.has_recording)

  // Build options from webinar.variants if available, otherwise fallback
  const rawVariants = webinar.variants || []

  const allBuiltOptions: DisplayOption[] =
    rawVariants.length > 0
      ? rawVariants.map((v) => {
          const items: string[] = []
          if (v.includes?.live && !isCompleted) items.push("Live webinar stream & Q&A")
          if (v.includes?.recording) items.push("Full HD recorded video replay")
          if (v.includes?.transcript) items.push("Full verbatim transcript document")
          if (v.includes?.pdf) items.push("Complete PDF study guide & worksheets")

          const isBundle = v.option_type === "bundle" || (v.includes?.recording && v.includes?.transcript && v.includes?.pdf)

          let isAvailable = (v as any).is_available !== false
          let unavailableReason = (v as any).availability_reason || undefined

          if (isCompleted) {
            if (v.option_type === "live") {
              isAvailable = false
              unavailableReason = "Live session concluded"
            } else if (v.option_type === "recording" && !isRecordingReady) {
              isAvailable = false
              unavailableReason = "Recording coming soon"
            } else if (isBundle && !isRecordingReady) {
              isAvailable = false
              unavailableReason = "Recording coming soon"
            }
          }

          return {
            variantId: v.id,
            type: v.option_type || "live",
            title: v.title,
            price: v.price !== undefined ? v.price : 149,
            currencyCode: v.currency_code ? v.currency_code.toUpperCase() : "USD",
            description:
              v.description && v.description !== "Verified access format."
                ? v.description
                : isBundle
                ? "All formats included in one package."
                : "",
            badge: isBundle && isAvailable ? "Best Value" : undefined,
            includedItems: items.length > 0 ? items : ["Full access to session materials"],
            isAvailable,
            unavailableReason,
          }
        })
      : [
          {
            variantId: "default_bundle",
            type: "bundle",
            title: "Complete Package (All Included)",
            price: 249,
            currencyCode: "USD",
            badge: !isCompleted || isRecordingReady ? "Best Value" : undefined,
            description: "All-inclusive pass granting full access to Recording, Transcript, and PDF materials.",
            includedItems: [
              ...(isCompleted ? [] : ["Live Webinar Access with Q&A"]),
              "Full HD Recorded Webinar Access",
              "Complete Verbatim Written Transcript",
              "All PDF Resources & Practice Worksheets",
            ],
            isAvailable: !isCompleted || isRecordingReady,
            unavailableReason: isCompleted && !isRecordingReady ? "Recording coming soon" : undefined,
          },
          {
            variantId: "default_live",
            type: "live",
            title: "Live Webinar Access",
            price: 149,
            currencyCode: "USD",
            description: "Interactive real-time broadcast, live Q&A with instructor, and CPE credit verification.",
            includedItems: ["Live session joining link", "Live Q&A participation", "Eligible for CPE attendance tracking"],
            isAvailable: !isCompleted,
            unavailableReason: isCompleted ? "Live session concluded" : undefined,
          },
          {
            variantId: "default_rec",
            type: "recording",
            title: "Recorded Webinar",
            price: 149,
            currencyCode: "USD",
            description: "On-demand high-definition video access with full playback controls for 1 year.",
            includedItems: ["Full HD video recording", "Anytime playback on all devices", "Viewing instructions"],
            isAvailable: !isCompleted || isRecordingReady,
            unavailableReason: isCompleted && !isRecordingReady ? "Recording coming soon" : undefined,
          },
          {
            variantId: "default_transcript",
            type: "transcript",
            title: "Webinar Transcript",
            price: 49,
            currencyCode: "USD",
            description: "Complete verbatim written transcript of the entire session and attendee Q&A.",
            includedItems: ["Online reading access", "Searchable text transcript", "Downloadable document format"],
            isAvailable: true,
          },
          {
            variantId: "default_pdf",
            type: "pdf",
            title: "PDF Study Guide & Resources",
            price: 29,
            currencyCode: "USD",
            description: "Comprehensive instructor presentation slides, IRS compliance checklists, and worksheets.",
            includedItems: ["Instructor slide deck", "Practice audit checklists", "Step-by-step worksheets"],
            isAvailable: true,
          },
        ]

  // Completely remove Live option for completed events so customers cannot select live for completed events
  const displayOptions = allBuiltOptions.filter((opt) => {
    if (isCompleted && opt.type === "live") {
      return false
    }
    return true
  })

  const availableOptions = displayOptions.filter((o) => o.isAvailable !== false)
  const defaultOption = availableOptions.find((o) => o.badge) || availableOptions[0] || displayOptions[0]
  const [selectedVariantId, setSelectedVariantId] = useState<string>(defaultOption?.variantId || "")

  const selectedOption =
    displayOptions.find((o) => o.variantId === selectedVariantId && o.isAvailable !== false) ||
    availableOptions[0] ||
    displayOptions[0]

  // Pre-fetch destination routes so page transition happens instantaneously
  useEffect(() => {
    if (typeof window !== "undefined") {
      router.prefetch(`/${countryCode}/register?returnUrl=/${countryCode}/checkout`)
      router.prefetch(`/${countryCode}/checkout`)
    }
  }, [countryCode, router])

  const handleDirectEnroll = async () => {
    if (!selectedOption || selectedOption.isAvailable === false) return

    setLoading(true)
    setSuccessMessage(null)
    setRegisterError(null)

    try {
      let targetVariantId = selectedOption.variantId

      // If variantId is a fallback (starts with default_ or var_custom_), find the real variant
      if (!targetVariantId || targetVariantId.startsWith("default_") || targetVariantId.startsWith("var_custom_")) {
        const matchingRealVariant = (webinar.variants || []).find(
          (v: any) =>
            v.option_type === selectedOption.type &&
            v.id &&
            !v.id.startsWith("default_") &&
            !v.id.startsWith("var_custom_")
        )
        if (matchingRealVariant?.id) {
          targetVariantId = matchingRealVariant.id
        } else {
          // Fallback to any real variant on this webinar
          const anyRealVariant = (webinar.variants || []).find(
            (v: any) => v.id && !v.id.startsWith("default_") && !v.id.startsWith("var_custom_")
          )
          if (anyRealVariant?.id) {
            targetVariantId = anyRealVariant.id
          }
        }
      }

      if (!targetVariantId || targetVariantId.startsWith("default_")) {
        throw new Error("This option is currently being configured. Please refresh or select another option.")
      }

      await fastDirectEnroll({
        variantId: targetVariantId,
        countryCode,
      })

      if (!customer) {
        router.push(`/${countryCode}/register?returnUrl=/${countryCode}/checkout`)
      } else {
        router.push(`/${countryCode}/checkout`)
      }
    } catch (err: any) {
      console.error("Direct enroll error:", err)
      setRegisterError(err.message || "Failed to proceed to checkout. Please try again.")
      setLoading(false)
    }
  }

  // Handle Free Registration via Active Subscription
  const handleSubscriptionRegister = async () => {
    if (!customer && !authToken) {
      router.push(`/${countryCode}/login?returnUrl=/${countryCode}/webinars/${webinar.slug}`)
      return
    }

    setRegistering(true)
    setRegisterError(null)

    try {
      const res = await registerWebinarWithSubscription(
        webinar.id,
        authToken,
        customer?.email,
        customer?.id
      )

      if (res.error) {
        setRegisterError(res.message || "Failed to register with subscription")
      } else {
        setSuccessMessage("Success! This webinar has been unlocked with your subscription.")
        const updatedStatus = await getWebinarSubscriptionStatus(
          webinar.id,
          authToken,
          customer?.email,
          customer?.id
        )
        if (updatedStatus) {
          setSubStatus(updatedStatus)
        } else {
          setSubStatus((prev: any) => ({
            ...prev,
            is_registered: true,
            can_register_free: false,
          }))
        }
      }
    } catch (err: any) {
      setRegisterError(err.message || "Failed to register with subscription")
    } finally {
      setRegistering(false)
    }
  }

  const hasActiveSub = Boolean(subStatus?.has_active_subscription)
  const isIncludedInPlan = Boolean(subStatus?.is_webinar_included)
  const isRegistered = Boolean(subStatus?.is_registered)
  const canRegisterFree = Boolean(subStatus?.can_register_free)
  const limitReached = Boolean(subStatus?.limit_reached)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm transition-colors">
      {/* 1. STATE: REGISTERED / UNLOCKED WITH SUBSCRIPTION OR ORDER */}
      {isRegistered ? (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Webinar Access Unlocked</span>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
              {subStatus?.entitlement_source === "subscription"
                ? `You have full access to this course included with your active ${subStatus?.subscription?.plan_name || "AcademyIO"} subscription.`
                : "You have verified active access to this webinar course."}
            </p>
          </div>

          {/* Access Controls Box */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Your Course Access & Materials
            </h4>

            {/* Live Stream Access */}
            {!isCompleted && (
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-xs text-gray-900 dark:text-white block">
                      Live Broadcast Access
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                      {subStatus?.materials?.live_stream_url
                        ? "Stream link is live"
                        : "Link activates 1 hour prior to session"}
                    </span>
                  </div>
                </div>

                {subStatus?.materials?.live_stream_url ? (
                  <a
                    href={subStatus.materials.live_stream_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <span>Join Session</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40">
                    Confirmed Attendee
                  </span>
                )}
              </div>
            )}

            {/* Video Recording */}
            {(isRecordingReady || isCompleted) && (
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-xs text-gray-900 dark:text-white block">
                      Video Recording Replay
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400">
                      Full HD on-demand video access
                    </span>
                  </div>
                </div>

                <Link
                  href={`/${countryCode}/dashboard?tab=recordings`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <span>Watch Replay</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Transcript & PDF */}
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <span className="font-semibold text-xs text-gray-900 dark:text-white block">
                    Transcripts & Study Guides
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    Verbatim transcripts & handouts
                  </span>
                </div>
              </div>

              <Link
                href={`/${countryCode}/dashboard?tab=downloads`}
                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-600 font-bold text-xs flex items-center gap-1"
              >
                <span>Downloads</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Go to Dashboard Button */}
            <Link
              href={`/${countryCode}/dashboard?tab=overview`}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700 font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all mt-3"
            >
              <span>Access All Materials in My Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Toggle for purchasing additional seats */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAlternativePurchases(!showAlternativePurchases)}
              className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium py-1 cursor-pointer"
            >
              <span>Need additional team seats or a permanent order?</span>
              {showAlternativePurchases ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. STATE: ACTIVE SUBSCRIPTION & CAN REGISTER FREE */}
      {!isRegistered && hasActiveSub && isIncludedInPlan && canRegisterFree ? (
        <div className="space-y-5">
          {/* Included in Subscription Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Included in Your Subscription
                </span>
                <span className="text-[11px] font-medium text-blue-200">
                  {subStatus.subscription?.plan_name || "Active Tier"}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  Zero Additional Cost Registration
                </h3>
                <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                  As an active subscriber, you can register for this webinar and unlock complete attendance, video replay, transcript, and study materials immediately.
                </p>
              </div>

              {/* Usage Limit indicator */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
                <span>Monthly Registration Allowance:</span>
                <span className="font-bold text-white">
                  {subStatus.plan?.webinar_access_limit
                    ? `${subStatus.subscription?.monthly_access_used || 0} / ${subStatus.plan.webinar_access_limit} used`
                    : "Unlimited Webinars"}
                </span>
              </div>
            </div>
          </div>

          {/* Success / Error Messages */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {registerError && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{registerError}</span>
            </div>
          )}

          {/* Register Button */}
          <button
            type="button"
            disabled={registering}
            onClick={handleSubscriptionRegister}
            className="w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed group"
          >
            {registering ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Registering Webinar Access...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Register Now — Free with Subscription</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-1" />
              </>
            )}
          </button>

          {/* Toggle for purchasing additional seats */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAlternativePurchases(!showAlternativePurchases)}
              className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium py-1 cursor-pointer"
            >
              <span>Purchase individual licenses separately?</span>
              {showAlternativePurchases ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : null}

      {/* 3. STATE: MONTHLY LIMIT REACHED */}
      {!isRegistered && hasActiveSub && isIncludedInPlan && limitReached ? (
        <div className="space-y-4 mb-6">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Monthly Subscription Limit Reached</span>
            </div>
            <p className="leading-relaxed text-amber-800 dark:text-amber-300">
              You have registered for {subStatus?.subscription?.monthly_access_used || 0} of {subStatus?.plan?.webinar_access_limit || 0} webinars allowed under your current tier this month.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <Link
                href={`/${countryCode}/subscriptions`}
                className="font-bold text-amber-900 dark:text-amber-100 underline hover:no-underline"
              >
                Upgrade to Unlimited Tier →
              </Link>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            You can purchase this webinar individually below without affecting your subscription:
          </p>
        </div>
      ) : null}

      {/* 4. STATE: EXCLUDED FROM PLAN */}
      {!isRegistered && hasActiveSub && !isIncludedInPlan ? (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-300 mb-5 space-y-1">
          <span className="font-bold text-gray-900 dark:text-white block">
            Specialized Course
          </span>
          <span>
            This webinar is excluded from standard subscription coverage. You can purchase direct access below.
          </span>
        </div>
      ) : null}

      {/* 5. STANDARD PURCHASE OPTIONS (Shown when not subscribed, or limit reached, or user toggled alternative purchase) */}
      {(!isRegistered && (!hasActiveSub || limitReached || !isIncludedInPlan)) || (showAlternativePurchases) ? (
        <div className={isRegistered || (hasActiveSub && canRegisterFree) ? "pt-4 border-t border-gray-100 dark:border-slate-800 mt-3" : ""}>
          <div className="border-b border-gray-100 dark:border-slate-800 pb-3 mb-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {isCompleted ? "Select Self-Study Option" : "Select Purchase Option"}
              </h3>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-900/50">
                {displayOptions.length} Options
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
              {isCompleted
                ? "Choose from self-study recordings, transcripts, and study guides."
                : "Select individual materials or the complete pass below."}
            </p>
          </div>

          {/* Completed & Processing Notice */}
          {isCompleted && !isRecordingReady && (
            <div className="mb-3.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
              <div>
                <span className="font-bold block">Live Session Concluded</span>
                <span className="text-amber-800 dark:text-amber-300 text-[11px] block mt-0.5">
                  The live broadcast has concluded. The recording is currently being processed and will be available once published. You can still purchase the written transcript or PDF study guide.
                </span>
              </div>
            </div>
          )}

          {/* Option Cards */}
          <div className="space-y-2 mb-4">
            {displayOptions.map((opt) => {
              const isAvailable = opt.isAvailable !== false
              const isSelected = isAvailable && selectedVariantId === opt.variantId

              return (
                <div
                  key={opt.variantId}
                  onClick={() => {
                    if (isAvailable) setSelectedVariantId(opt.variantId)
                  }}
                  className={`rounded-xl border py-2.5 px-3 sm:px-3.5 transition-all duration-150 ${
                    !isAvailable
                      ? "opacity-60 bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800 cursor-not-allowed"
                      : isSelected
                      ? "cursor-pointer border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-600 shadow-xs"
                      : "cursor-pointer border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          !isAvailable
                            ? "border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700"
                            : isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-semibold text-xs sm:text-sm ${isAvailable ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-slate-500"}`}>
                            {opt.title}
                          </span>
                          {!isAvailable && opt.unavailableReason ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                              {opt.unavailableReason}
                            </span>
                          ) : opt.badge ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
                              {opt.badge}
                            </span>
                          ) : null}
                        </div>

                        {/* Selected option inclusions */}
                        {isSelected && opt.includedItems && opt.includedItems.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-900/30 flex flex-wrap gap-x-3 gap-y-1">
                            {opt.includedItems.map((item, idx) => (
                              <span key={idx} className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-slate-300">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{item}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 whitespace-nowrap pl-2">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className={`text-base font-extrabold ${isAvailable ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-slate-600"}`}>
                          ${opt.price}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">
                          {opt.currencyCode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Error Message for Direct Enrollment */}
          {registerError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/60 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{registerError}</span>
            </div>
          )}

          {/* Direct Enrollment Button */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={loading || !selectedOption || selectedOption.isAvailable === false}
              onClick={handleDirectEnroll}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {!customer ? "Taking you to Registration..." : "Preparing Checkout..."}
                  </span>
                </>
              ) : !selectedOption || selectedOption.isAvailable === false ? (
                <span>Selected Option Unavailable</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isCompleted ? "Enroll in Self-Study" : "Register & Enroll Now"} • ${selectedOption.price}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-0.5" />
                </>
              )}
            </button>
          </div>

          {/* Subscription Banner for non-subscribers */}
          {!hasActiveSub && (
            <div className="mt-3.5 p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-2.5">
              <div className="min-w-0 pr-1">
                <span className="flex items-center gap-1.5 font-bold text-xs text-blue-950 dark:text-blue-200 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  Want this webinar included free?
                </span>
                <span className="text-[11px] text-blue-800 dark:text-blue-300 block line-clamp-1">
                  Subscribe from $99/mo to unlock unlimited webinars.
                </span>
              </div>
              <Link
                href={`/${countryCode}/subscriptions`}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                View Plans
              </Link>
            </div>
          )}
        </div>
      ) : null}

      {/* Trust Badges */}
      <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-around text-[11px] text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Instant Dashboard Access
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Certificate Eligible
        </span>
      </div>
    </div>
  )
}
