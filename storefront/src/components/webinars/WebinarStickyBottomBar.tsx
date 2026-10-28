"use client"

import React, { useEffect, useState } from "react"
import { ArrowDown, ShoppingBag, Sparkles, Award } from "lucide-react"

interface WebinarStickyBottomBarProps {
  title: string
  minPrice: number
  currency: string
  isSubscriptionIncluded?: boolean
  cpeCredits?: number
  isCompleted?: boolean
}

export default function WebinarStickyBottomBar({
  title,
  minPrice,
  currency,
  isSubscriptionIncluded,
  cpeCredits,
  isCompleted,
}: WebinarStickyBottomBarProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById("purchase-options")
    if (!target) return

    let isTargetIntersecting = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        isTargetIntersecting = entry.isIntersecting
        updateVisibility()
      },
      { threshold: 0.15 }
    )

    const updateVisibility = () => {
      const scrollY = window.scrollY || window.pageYOffset
      // Show when scrolled down at least 250px AND the purchase card is not currently visible
      if (scrollY > 250 && !isTargetIntersecting) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    observer.observe(target)
    window.addEventListener("scroll", updateVisibility, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", updateVisibility)
    }
  }, [])

  const handleScrollToPurchase = () => {
    const el = document.getElementById("purchase-options")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      el.classList.add("ring-4", "ring-blue-500", "transition-all")
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-blue-500")
      }, 2000)
    }
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Price & Format Snapshot */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-gray-900 dark:text-white">
              {isSubscriptionIncluded ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Free with Subscription</span>
              ) : (
                <>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 font-normal mr-1">From</span>
                  ${minPrice} <span className="text-[10px] text-gray-500 dark:text-slate-400 uppercase">{currency}</span>
                </>
              )}
            </span>
            {cpeCredits && cpeCredits > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {cpeCredits} CPE
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
            {isCompleted ? "Self-Study Video, Transcript & PDF" : "Live Session, Video Replay & PDF"}
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleScrollToPurchase}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
        >
          {isSubscriptionIncluded ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Enroll Free</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5 text-blue-200" />
              <span>Select Option</span>
            </>
          )}
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
