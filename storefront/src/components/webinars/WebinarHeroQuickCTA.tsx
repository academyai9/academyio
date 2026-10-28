"use client"

import React from "react"
import { ArrowDown, ShoppingBag, Sparkles, CheckCircle2 } from "lucide-react"

interface WebinarHeroQuickCTAProps {
  minPrice: number
  maxPrice: number
  currency: string
  isSubscriptionIncluded?: boolean
  hasActiveSubscription?: boolean
  isCompleted?: boolean
  hasRecording?: boolean
}

export default function WebinarHeroQuickCTA({
  minPrice,
  maxPrice,
  currency,
  isSubscriptionIncluded,
  hasActiveSubscription,
  isCompleted,
  hasRecording,
}: WebinarHeroQuickCTAProps) {
  const handleScrollToPurchase = () => {
    const el = document.getElementById("purchase-options")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      // Highlight effect
      el.classList.add("ring-4", "ring-blue-500", "ring-offset-4", "ring-offset-slate-950", "transition-all")
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-blue-500", "ring-offset-4", "ring-offset-slate-950")
      }, 2000)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
      <button
        type="button"
        onClick={handleScrollToPurchase}
        className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
      >
        {isSubscriptionIncluded ? (
          <>
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Enroll Free with Subscription</span>
            <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </>
        ) : (
          <>
            <ShoppingBag className="w-4 h-4 text-blue-200" />
            <span>Select Purchase Option & Enroll</span>
            <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </>
        )}
      </button>
    </div>
  )
}
