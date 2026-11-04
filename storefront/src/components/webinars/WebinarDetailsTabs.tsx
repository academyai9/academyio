"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  Users,
  ShieldCheck,
  ArrowRight,
  BadgeCheck,
  Sparkles,
  FileText,
  Clock,
  Layers,
  MessageSquare,
  ShieldAlert,
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
    <div id="course-tabs" className="scroll-mt-28 space-y-5">
      {/* Top Segmented Navigation Tabs */}
      <div className="bg-slate-100/90 dark:bg-slate-900/90 p-1.5 sm:p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs backdrop-blur-md">
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {/* Tab 1: Overview */}
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Overview</span>
          </button>

          {/* Tab 2: Faculty */}
          <button
            type="button"
            onClick={() => handleTabChange("faculty")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "faculty"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/60"
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span className="truncate">Faculty</span>
          </button>

          {/* Tab 3: Credits */}
          <button
            type="button"
            onClick={() => handleTabChange("credits")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "credits"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/60"
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span className="truncate">Credits</span>
            {cpeCredits && Number(cpeCredits) > 0 ? (
              <span
                className={`inline-flex px-1.5 py-0.5 text-[10px] font-extrabold rounded-md transition-colors ${
                  activeTab === "credits"
                    ? "bg-blue-500/90 text-white"
                    : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80"
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
          <div id="overview" className="space-y-5 animate-fadeIn">
            {/* Description Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                      Course Overview & Program Description
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Comprehensive professional syllabus and curriculum breakdown
                    </p>
                  </div>
                </div>

                {webinar.category && (
                  <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                    {webinar.category}
                  </span>
                )}
              </div>

              <div
                className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 pt-1"
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        Key Learning Objectives
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Core competencies and practical takeaways from this session
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                    {webinar.learning_objectives.length} Key Takeaways
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1">
                  {webinar.learning_objectives.map((obj: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/80 transition-colors hover:border-blue-200 dark:hover:border-blue-800/60"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                        {i + 1}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {obj}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience & Prerequisites */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    Target Audience & Qualifications
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Recommended experience level and prerequisite preparation
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Who Should Attend
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {webinar.target_audience ||
                      "CPAs, Enrolled Agents (EAs), Tax Attorneys, Controllers, Financial Officers, and Corporate Tax Preparers."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3.5 bg-slate-50/70 dark:bg-slate-850/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-slate-100">
                        Program Instructional Level
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        {creditInfo?.learning_level || "Intermediate to Advanced"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 dark:bg-slate-850/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-slate-100">
                        Prerequisites & Preparation
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        {creditInfo?.prerequisites || "Basic federal tax & financial reporting knowledge"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Satisfaction Guarantee & Cancellation Policy */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-50/80 via-slate-50/60 to-white dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-2xl border border-blue-200/80 dark:border-slate-800 flex items-start gap-4 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  AcademyIO 100% Satisfaction Guarantee & Cancellation Policy
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {webinar.refund_policy ||
                    "Full refunds are granted up to 24 hours prior to the live broadcast. All registrants receive 1 full year of continuous 24/7 on-demand access to recordings, slide decks, and transcripts."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: FACULTY ================= */}
        {activeTab === "faculty" && (
          <div id="instructor" className="space-y-5 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    Faculty Profile & Credentials
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Meet your instructor and subject matter authority
                  </p>
                </div>
              </div>

              {/* Faculty Spotlight Hero Banner */}
              <div className="p-6 sm:p-7 bg-gradient-to-br from-slate-50 via-blue-50/25 to-indigo-50/30 dark:from-slate-850 dark:via-slate-800/60 dark:to-slate-850 rounded-2xl border border-blue-100/90 dark:border-slate-700/70">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 sm:gap-5">
                    {webinar.speaker_photo ? (
                      <img
                        src={webinar.speaker_photo}
                        alt={webinar.speaker_name}
                        loading="lazy"
                        decoding="async"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-md ring-2 ring-blue-500/20 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                        {webinar.speaker_name ? webinar.speaker_name.charAt(0) : "F"}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/60">
                          <BadgeCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          Verified Instructor
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300">
                          Live Q&A Leader
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {webinar.speaker_name}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        {webinar.speaker_title ||
                          "Subject Matter Authority & Corporate Educator"}
                      </p>
                    </div>
                  </div>

                  {webinar.speaker_id && (
                    <Link
                      href={`/${countryCode}/speakers/${webinar.speaker_id}`}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs hover:shadow-sm flex items-center gap-1.5 active:scale-95"
                    >
                      <span>View Faculty Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Biography Section */}
              <div className="space-y-2.5 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Faculty Background & Experience
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {webinar.speaker_bio ||
                    "Nationally recognized educator with extensive hands-on experience advising clients and training practitioners across corporate and individual tax, accounting, and compliance standards."}
                </p>
              </div>

              {/* Three Pillars of Faculty Distinction */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 bg-slate-50/70 dark:bg-slate-850/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Live Q&A Access
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Submit real client scenarios during the live session for direct faculty guidance.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 dark:bg-slate-850/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Practitioner Led
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Decades of active advisory practice providing battle-tested implementations.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 dark:bg-slate-850/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Compliance Rigor
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Curriculum strictly verified against active IRS and NASBA continuing education regulations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CREDITS ================= */}
        {activeTab === "credits" && (
          <div id="credits" className="space-y-5 animate-fadeIn">
            <WebinarCreditsAndInfo webinar={webinar} creditInfo={creditInfo} />

            {/* Fallback card if webinar has no official credit info configured */}
            {!((webinar.cpe_credits && webinar.cpe_credits > 0) || Boolean(creditInfo?.cpe_credit)) &&
              !creditInfo && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-8 shadow-xs text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Digital Certificate of Completion
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
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
