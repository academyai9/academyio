"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen,
  User,
  Award,
  CheckCircle2,
  Users,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import WebinarCreditsAndInfo from "./WebinarCreditsAndInfo"

export type WebinarTabType = "overview" | "faculty" | "credits"

interface WebinarDetailsTabsProps {
  webinar: any
  countryCode: string
  creditInfo?: any
  initialTab?: WebinarTabType
}

export default function WebinarDetailsTabs({
  webinar,
  countryCode,
  creditInfo,
  initialTab = "overview",
}: WebinarDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<WebinarTabType>(initialTab)

  const cpeCredits = creditInfo?.cpe_credit ?? webinar.cpe_credits ?? null

  const handleTabChange = (tabId: WebinarTabType) => {
    setActiveTab(tabId)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("webinar-tab-updated", { detail: tabId })
      )
    }
  }

  // Listen for external requests to switch tabs (e.g. from WebinarQuickNav or hash links)
  useEffect(() => {
    const handleExternalTabSelect = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === "faculty" || detail === "instructor") {
        setActiveTab("faculty")
      } else if (detail === "overview" || detail === "objectives") {
        setActiveTab("overview")
      } else if (detail === "credits") {
        setActiveTab("credits")
      }
    }

    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "").toLowerCase()
      if (hash === "faculty" || hash === "instructor") {
        setActiveTab("faculty")
      } else if (hash === "credits") {
        setActiveTab("credits")
      } else if (hash === "overview" || hash === "objectives") {
        setActiveTab("overview")
      }
    }

    window.addEventListener("webinar-select-tab", handleExternalTabSelect)
    return () => {
      window.removeEventListener("webinar-select-tab", handleExternalTabSelect)
    }
  }, [])

  return (
    <div id="course-tabs" className="scroll-mt-28 space-y-4">
      {/* Top Segmented Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 p-1.5 sm:p-2 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {/* Tab 1: Overview */}
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Overview</span>
          </button>

          {/* Tab 2: Faculty */}
          <button
            type="button"
            onClick={() => handleTabChange("faculty")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "faculty"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">Faculty</span>
          </button>

          {/* Tab 3: Accreditation & Credits */}
          <button
            type="button"
            onClick={() => handleTabChange("credits")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "credits"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Accreditation & Credits</span>
            <span className="sm:hidden truncate">Credits</span>
            {cpeCredits && Number(cpeCredits) > 0 ? (
              <span
                className={`hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-extrabold rounded-md transition-colors ${
                  activeTab === "credits"
                    ? "bg-blue-500/80 text-white"
                    : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                }`}
              >
                {cpeCredits} CPE
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-150">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div id="overview" className="space-y-4 sm:space-y-5">
            {/* Description Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                  Course Overview & Program Description
                </h2>
              </div>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-slate-300 leading-relaxed space-y-2.5 pt-1"
                dangerouslySetInnerHTML={{
                  __html:
                    webinar.description ||
                    "<p>Full program description available.</p>",
                }}
              />
            </div>

            {/* Key Learning Objectives */}
            {webinar.learning_objectives && webinar.learning_objectives.length > 0 && (
              <div
                id="objectives"
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-3.5"
              >
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                    Key Learning Objectives
                  </h2>
                </div>
                <ul className="space-y-2.5 pt-1">
                  {webinar.learning_objectives.map((obj: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 dark:text-slate-300 bg-gray-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-100/80 dark:border-slate-800/80"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Audience & Qualifications */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                  Target Audience & Qualifications
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed pt-1">
                {webinar.target_audience ||
                  "CPAs, Enrolled Agents (EAs), Tax Attorneys, Controllers, Financial Officers, and Corporate Tax Preparers."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-gray-600 dark:text-slate-400">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <strong className="text-gray-900 dark:text-slate-200">
                    Program Level:
                  </strong>{" "}
                  Intermediate to Advanced
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-100 dark:border-slate-800">
                  <strong className="text-gray-900 dark:text-slate-200">
                    Prerequisites:
                  </strong>{" "}
                  Basic knowledge of federal taxation & financial reporting
                </div>
              </div>
            </div>

            {/* Refund & Cancellation Policy */}
            <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 flex items-start gap-3.5">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                  Cancellation & Guarantee Policy
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {webinar.refund_policy ||
                    "Full refunds are granted up to 24 hours prior to the live session broadcast. Self-study recordings provide 1 year of continuous access."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: FACULTY ================= */}
        {activeTab === "faculty" && (
          <div id="instructor" className="space-y-4 sm:space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                  About the Instructor
                </h2>
              </div>

              {/* Instructor Hero Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-slate-850 dark:via-slate-800/60 dark:to-slate-850 rounded-2xl border border-blue-100/80 dark:border-slate-700/60">
                <div className="flex items-center gap-4">
                  {webinar.speaker_photo ? (
                    <img
                      src={webinar.speaker_photo}
                      alt={webinar.speaker_name}
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl shrink-0 border border-blue-200 dark:border-slate-600">
                      {webinar.speaker_name ? webinar.speaker_name.charAt(0) : "F"}
                    </div>
                  )}
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/60 mb-1">
                      Lead Faculty
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
                      {webinar.speaker_name}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                      {webinar.speaker_title ||
                        "Subject Matter Authority & Educator"}
                    </p>
                  </div>
                </div>

                {webinar.speaker_id && (
                  <Link
                    href={`/${countryCode}/speakers/${webinar.speaker_id}`}
                    className="shrink-0 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5"
                  >
                    <span>View Faculty Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Biography Section */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Faculty Biography
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {webinar.speaker_bio ||
                    "Nationally recognized educator with extensive hands-on experience advising clients and training practitioners across corporate and individual tax, accounting, and compliance."}
                </p>
              </div>

              {/* Trust & Accreditation Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-gray-900 dark:text-slate-200">
                      Interactive Q&A Session
                    </p>
                    <p className="text-gray-500 dark:text-slate-400 mt-0.5">
                      Direct access during the live session to have your specific questions answered.
                    </p>
                  </div>
                </div>
                <div className="p-3.5 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-gray-900 dark:text-slate-200">
                      Vetted Industry Expert
                    </p>
                    <p className="text-gray-500 dark:text-slate-400 mt-0.5">
                      Course materials developed to adhere to strict national continuing education standards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: ACCREDITATION & CREDITS ================= */}
        {activeTab === "credits" && (
          <div id="credits" className="space-y-4 sm:space-y-5">
            <WebinarCreditsAndInfo webinar={webinar} creditInfo={creditInfo} />

            {/* Fallback card if webinar has no official credit info configured */}
            {!((webinar.cpe_credits && webinar.cpe_credits > 0) || Boolean(creditInfo?.cpe_credit)) &&
              !creditInfo && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-xs text-center space-y-3">
                  <Award className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Digital Certificate of Completion
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    This educational program provides a verified Certificate of
                    Completion upon finishing the session. You can download your
                    certificate directly from your account dashboard.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
