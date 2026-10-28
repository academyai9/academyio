"use client"

import React, { useState, useEffect } from "react"
import { ShoppingBag, Sparkles } from "lucide-react"

interface WebinarQuickNavProps {
  minPrice: number
  currency: string
  isSubscriptionIncluded?: boolean
  hasObjectives?: boolean
  hasCredits?: boolean
}

export default function WebinarQuickNav({
  minPrice,
  currency,
  isSubscriptionIncluded,
  hasObjectives = true,
  hasCredits = true,
}: WebinarQuickNavProps) {
  const [activeSection, setActiveSection] = useState<string>("overview")

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      if (id === "purchase-options") {
        el.classList.add("ring-4", "ring-blue-500", "transition-all")
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-blue-500")
        }, 2000)
      }
    }
  }

  useEffect(() => {
    const sectionIds = ["overview", "instructor", "objectives", "credits", "purchase-options"]
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i]
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(id)
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-2.5 overflow-x-auto no-scrollbar">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollTo("instructor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeSection === "instructor"
                  ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Faculty
            </button>

            <button
              type="button"
              onClick={() => scrollTo("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeSection === "overview"
                  ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Overview
            </button>

            {hasObjectives && (
              <button
                type="button"
                onClick={() => scrollTo("objectives")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeSection === "objectives"
                    ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Objectives
              </button>
            )}

            {hasCredits && (
              <button
                type="button"
                onClick={() => scrollTo("credits")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeSection === "credits"
                    ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Accreditation & Credits
              </button>
            )}
          </div>

          {/* Direct Purchase Option Button in Sub-nav */}
          <button
            type="button"
            onClick={() => scrollTo("purchase-options")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all shrink-0 cursor-pointer active:scale-95"
          >
            {isSubscriptionIncluded ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Free with Subscription</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 text-blue-200" />
                <span>Select Option (From ${minPrice})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
