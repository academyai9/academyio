"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Video, FileText, Download, Sparkles, Check, ShoppingBag, ShieldCheck, CreditCard } from "lucide-react"
import { WebinarItem } from "@lib/data/webinars"
import { addToCart } from "@lib/data/cart"

interface PurchaseOptionsProps {
  webinar: WebinarItem
  countryCode: string
}

interface OptionConfig {
  type: string
  title: string
  price: number
  description: string
  badge?: string
  icon: any
  includedItems: string[]
}

const DEFAULT_OPTIONS: OptionConfig[] = [
  {
    type: "live",
    title: "Live Webinar Access",
    price: 149,
    description: "Interactive real-time broadcast, live Q&A with instructor, and CPE credit verification.",
    icon: Video,
    includedItems: ["Live session joining link", "Live Q&A participation", "Eligible for CPE attendance tracking"],
  },
  {
    type: "recording",
    title: "Recorded Webinar",
    price: 149,
    description: "On-demand high-definition video access with full playback controls for 1 year.",
    icon: Video,
    includedItems: ["Full HD video recording", "Anytime playback on all devices", "Viewing instructions"],
  },
  {
    type: "transcript",
    title: "Webinar Transcript",
    price: 49,
    description: "Complete verbatim written transcript of the entire session and attendee Q&A.",
    icon: FileText,
    includedItems: ["Online reading access", "Searchable text transcript", "Downloadable document format"],
  },
  {
    type: "pdf",
    title: "PDF Study Guide & Resources",
    price: 29,
    description: "Comprehensive instructor presentation slides, IRS compliance checklists, and worksheets.",
    icon: Download,
    includedItems: ["Instructor slide deck", "Practice audit checklists", "Step-by-step worksheets"],
  },
  {
    type: "bundle",
    title: "Complete Package (All Included)",
    price: 249,
    badge: "Best Value • Save $127",
    description: "All-inclusive pass granting full access to Live session, Recording, Transcript, and PDF materials.",
    icon: Sparkles,
    includedItems: [
      "Live Webinar Access with Q&A",
      "Full HD Recorded Webinar Access",
      "Complete Verbatim Written Transcript",
      "All PDF Resources & Practice Worksheets",
    ],
  },
]

export default function WebinarPurchaseOptions({ webinar, countryCode }: PurchaseOptionsProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string>("bundle")
  const [loading, setLoading] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Map variants to options
  const variants = webinar.variants || []
  const selectedVariant = variants.find((v) => v.option_type === selectedType) || variants[0]

  const handleAddToCart = async (goToCheckout = false) => {
    setLoading(true)
    setSuccessMessage(null)

    try {
      if (selectedVariant?.id) {
        // Call Medusa cart action
        await addToCart({
          variantId: selectedVariant.id,
          quantity: 1,
          countryCode,
        })
      }

      setSuccessMessage("Added to your shopping cart!")

      if (goToCheckout) {
        router.push(`/${countryCode}/checkout`)
      } else {
        setTimeout(() => {
          router.push(`/${countryCode}/cart`)
        }, 600)
      }
    } catch (err: any) {
      console.error("Cart error:", err)
      // Fallback redirect to cart or show error
      router.push(`/${countryCode}/cart`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="border-b border-gray-100 pb-4 mb-5">
        <h3 className="text-lg font-bold text-gray-900">Select Purchase Option</h3>
        <p className="text-xs text-gray-500 mt-1">
          Choose the access format that fits your continuing professional education requirements.
        </p>
      </div>

      {/* Option Cards */}
      <div className="space-y-3 mb-6">
        {DEFAULT_OPTIONS.map((opt) => {
          const isSelected = selectedType === opt.type
          const Icon = opt.icon

          return (
            <div
              key={opt.type}
              onClick={() => setSelectedType(opt.type)}
              className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 ${
                isSelected
                  ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{opt.title}</span>
                      {opt.badge && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{opt.description}</p>

                    {/* Included bullets */}
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      {opt.includedItems.map((item, idx) => (
                        <span key={idx} className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Check className="w-3 h-3 text-emerald-600" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right whitespace-nowrap">
                  <span className="text-lg font-bold text-gray-900">${opt.price}</span>
                  <span className="text-xs text-gray-500 block">USD</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleAddToCart(true)}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <CreditCard className="w-4 h-4" />
          {loading ? "Processing..." : "Enroll Now & Proceed to Checkout"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => handleAddToCart(false)}
          className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold text-sm rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <ShoppingBag className="w-4 h-4 text-gray-600" />
          Add to Cart
        </button>

        {successMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            {successMessage}
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-around text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Instant Dashboard Access
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          Verified Certificate Eligible
        </span>
      </div>
    </div>
  )
}
