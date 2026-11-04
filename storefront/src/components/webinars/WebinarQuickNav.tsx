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
  hasCredits = true,
}: WebinarQuickNavProps) {
  const [activeSection, setActiveSection] = useState<string>("overview")

  const handleNavClick = (section: string) => {
    setActiveSection(section)

    if (section === "purchase-options") {
      const el = document.getElementById("purchase-options")
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        el.classList.add("ring-4", "ring-blue-500", "transition-all")
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-blue-500")
        }, 2000)
      }
      return
    }

    // Switch the tab inside WebinarDetailsTabs
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("webinar-select-tab", { detail: section })
      )
    }

    // Scroll to the course-tabs container
    const tabsContainer = document.getElementById("course-tabs")
    if (tabsContainer) {
      tabsContainer.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Sync with tab changes from WebinarDetailsTabs
  useEffect(() => {
    const handleTabUpdated = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail) {
        setActiveSection(detail)
      }
    }

    // Check hash on mount
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "").toLowerCase()
      if (hash === "faculty" || hash === "instructor") {
        setActiveSection("faculty")
      } else if (hash === "credits") {
        setActiveSection("credits")
      } else if (hash === "overview" || hash === "objectives") {
        setActiveSection("overview")
      }
    }

    window.addEventListener("webinar-tab-updated", handleTabUpdated)
    return () => window.removeEventListener("webinar-tab-updated", handleTabUpdated)
  }, [])

  return (
    <nav className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-2.5 overflow-x-auto no-scrollbar">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleNavClick("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeSection === "overview" || activeSection === "objectives"
                  ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Overview
            </button>

            <button
              type="button"
              onClick={() => handleNavClick("faculty")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeSection === "faculty" || activeSection === "instructor"
                  ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Faculty
            </button>

            {hasCredits && (
              <button
                type="button"
                onClick={() => handleNavClick("credits")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeSection === "credits"
                    ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Credits
              </button>
            )}
          </div>

          {/* Direct Purchase Option Button in Sub-nav */}
          <button
            type="button"
            onClick={() => handleNavClick("purchase-options")}
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
