"use client"

import React, { useState, useEffect } from "react"
import { ShieldCheck, Lock, Sliders, X, Check, Info } from "lucide-react"
import {
  CookieConsentSettings,
  getStoredCookieConsent,
  saveCookieConsent,
} from "@lib/util/cookie-consent"

interface CookiePreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  countryCode?: string
}

export default function CookiePreferencesModal({
  isOpen,
  onClose,
  countryCode = "us",
}: CookiePreferencesModalProps) {
  const [functional, setFunctional] = useState(true)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCookieConsent()
      if (stored) {
        setFunctional(stored.functional)
        setAnalytics(stored.analytics)
        setMarketing(stored.marketing)
      } else {
        setFunctional(true)
        setAnalytics(true)
        setMarketing(false)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    saveCookieConsent({ functional, analytics, marketing })
    onClose()
  }

  const handleAcceptAll = () => {
    saveCookieConsent({ functional: true, analytics: true, marketing: true })
    onClose()
  }

  const handleRejectAll = () => {
    saveCookieConsent({ functional: false, analytics: false, marketing: false })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-preferences-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 z-10 my-8 max-h-[90vh] flex flex-col transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
              <Sliders className="w-3.5 h-3.5" />
              <span>Cookie Control Center</span>
            </div>
            <h2
              id="cookie-preferences-title"
              className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight"
            >
              Cookie & Privacy Preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Close cookie preferences"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Categories Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
          <p className="leading-relaxed">
            When you visit AcademyIO, we store cookies on your browser to deliver our services, safeguard account integrity, and personalize your continuing education experience. You can customize your preferences below. Learn more in our{" "}
            <a
              href={`/${countryCode}/cookie-policy`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700"
            >
              Cookie Policy
            </a>
            .
          </p>

          {/* 1. Necessary */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-slate-100">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Strictly Necessary Cookies</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                Always Active
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Required for fundamental security, user authentication sessions, cart persistence, and bot/fraud prevention (Cloudflare Turnstile). Cannot be switched off.
            </p>
          </div>

          {/* 2. Functional */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Functional & Preference Cookies</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Remembers your interface display preferences (Dark/Light Mode), video player playback volume, and course topic filters.
            </p>
          </div>

          {/* 3. Analytics */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-slate-100">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Performance & Analytics Cookies</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Enables Google Analytics 4 to collect aggregated, anonymous traffic metrics so we can measure webinar engagement, diagnose server lag, and enhance page speeds.
            </p>
          </div>

          {/* 4. Marketing */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-slate-100">
                <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Marketing & Advertising Cookies</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Allows customized course promotions, educational event reminders, and prevents repetitive ads across third-party platforms (Google Ads, Meta).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRejectAll}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            Reject Non-Essential
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            Save My Preferences
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-colors"
          >
            Accept All Cookies
          </button>
        </div>
      </div>
    </div>
  )
}
