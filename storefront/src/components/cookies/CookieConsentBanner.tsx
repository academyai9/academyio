"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Cookie, Sliders, Check, ShieldCheck } from "lucide-react"
import {
  getStoredCookieConsent,
  saveCookieConsent,
  openCookiePreferencesModal,
} from "@lib/util/cookie-consent"

export default function CookieConsentBanner({ countryCode = "us" }: { countryCode?: string }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if consent has already been given
    const consent = getStoredCookieConsent()
    if (!consent) {
      // Small timeout to allow page layout to settle and give smooth entry
      const timer = setTimeout(() => setIsVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  if (!isVisible) return null

  const handleAcceptAll = () => {
    saveCookieConsent({ functional: true, analytics: true, marketing: true })
    setIsVisible(false)
  }

  const handleRejectNonEssential = () => {
    saveCookieConsent({ functional: false, analytics: false, marketing: false })
    setIsVisible(false)
  }

  const handleOpenPreferences = () => {
    setIsVisible(false)
    openCookiePreferencesModal()
  }

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-xl z-50 transition-all duration-300 animate-fade-in-top"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 text-gray-800 dark:text-slate-100">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>We value your privacy</span>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                GDPR & CCPA
              </span>
            </h3>
            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              AcademyIO uses essential cookies to keep our platform secure, preserve your webinar registrations, and enable login sessions. With your permission, we also use analytics and marketing cookies to measure platform performance and suggest accredited CPE topics. Learn more in our{" "}
              <Link
                href={`/${countryCode}/cookie-policy`}
                className="text-blue-600 dark:text-blue-400 underline font-semibold hover:text-blue-700"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            Accept All
          </button>
          <button
            type="button"
            onClick={handleRejectNonEssential}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            Reject Non-Essential
          </button>
          <button
            type="button"
            onClick={handleOpenPreferences}
            className="w-full sm:w-auto px-3 py-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
