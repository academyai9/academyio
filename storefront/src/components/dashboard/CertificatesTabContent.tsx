"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Sparkles,
  BookOpen,
  Calendar,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
} from "lucide-react"

export interface CertificateItem {
  id: string
  certificate_number: string
  customer_id: string
  customer_name: string
  customer_email?: string
  webinar_id: string
  webinar_title: string
  speaker_name?: string | null
  event_date?: string | null
  issue_date: string
  cpe_credits: number
  score_percentage: number
  signatory_name?: string | null
  signatory_title?: string | null
  issuer_name?: string | null
  status: string
}

export interface EligibleWebinarStatus {
  webinar_id: string
  webinar_title: string
  webinar_slug?: string
  speaker_name?: string
  cpe_credits?: number
  event_date?: string
  end_timestamp?: string
  is_ended?: boolean
  status: "upcoming" | "quiz_ready" | "cooldown" | "retake_ready" | "passed" | "quiz_unavailable"
  next_eligible_at?: string | null
  remaining_seconds?: number | null
  latest_attempt?: any
  certificate?: CertificateItem | null
}

export default function CertificatesTabContent({
  customerId,
  countryCode,
  certificates = [],
  eligibleWebinars = [],
}: {
  customerId?: string
  countryCode: string
  certificates: CertificateItem[]
  eligibleWebinars: EligibleWebinarStatus[]
}) {
  const [filter, setFilter] = useState<"all" | "passed" | "pending">("all")

  // Live countdown state for webinars on cooldown
  const [cooldownMap, setCooldownMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const w of eligibleWebinars) {
      if (w.status === "cooldown" && w.remaining_seconds) {
        map[w.webinar_id] = w.remaining_seconds
      }
    }
    return map
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldownMap((prev) => {
        const next: Record<string, number> = {}
        for (const [id, sec] of Object.entries(prev)) {
          if (sec > 1) {
            next[id] = sec - 1
          }
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`
  }

  const fmtDate = (d?: string | null) => {
    if (!d) return "October 2026"
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return String(d)
    }
  }

  const totalCertificates = certificates.length
  const totalCpeCredits = certificates.reduce(
    (acc, c) => acc + (Number(c.cpe_credits) || 0),
    0
  )
  const pendingQuizzes = eligibleWebinars.filter(
    (w) => w.status === "quiz_ready" || w.status === "retake_ready" || w.status === "cooldown"
  ).length

  // Filtered webinars
  const displayedWebinars = eligibleWebinars.filter((w) => {
    if (filter === "passed") return w.status === "passed"
    if (filter === "pending") return w.status !== "passed"
    return true
  })

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                My Certificates & Accredited CPE Evaluations
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Verify attendance, pass post-webinar comprehension quizzes (75% threshold), and download NASBA/IRS verified certificates.
            </p>
          </div>

          <Link
            href={`/${countryCode}/webinars/upcoming`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Browse Upcoming Webinars</span>
          </Link>
        </div>

        {/* 3 Executive Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Certificates Earned</span>
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white block">
              {totalCertificates} {totalCertificates === 1 ? "Certificate" : "Certificates"}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
              Verified & permanent credentials
            </span>
          </div>

          <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total CPE Awarded</span>
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white block">
              {totalCpeCredits.toFixed(1)} Credit Hours
            </span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
              NASBA / IRS compliant hours
            </span>
          </div>

          <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Quizzes Pending</span>
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-white block">
              {pendingQuizzes} {pendingQuizzes === 1 ? "Evaluation" : "Evaluations"}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
              Awaiting 75% passing score
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
          {(
            [
              { id: "all", label: "All Programs" },
              { id: "passed", label: `Certified (${totalCertificates})` },
              { id: "pending", label: `Pending Quiz (${pendingQuizzes})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filter === t.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Enrolled Webinar Certificate Status Cards */}
      <div className="space-y-4">
        {displayedWebinars.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-12 text-center space-y-3">
            <Award className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No Programs in this Filter</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              You haven&apos;t enrolled in any webinars matching this criteria. Register for live webinars to unlock accreditation quizzes.
            </p>
          </div>
        ) : (
          displayedWebinars.map((item) => {
            const cert = item.certificate
            const cooldownLeft = cooldownMap[item.webinar_id] || 0

            return (
              <div
                key={item.webinar_id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                        <Award className="w-3 h-3" />
                        <span>{item.cpe_credits || 1.0} CPE Credits</span>
                      </span>

                      {item.status === "passed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Passed ({cert?.score_percentage || 100}%)</span>
                        </span>
                      )}

                      {item.status === "upcoming" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Live Broadcast Scheduled</span>
                        </span>
                      )}

                      {item.status === "cooldown" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[11px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Cooldown Active</span>
                        </span>
                      )}

                      {(item.status === "quiz_ready" || item.status === "retake_ready") && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                          <BookOpen className="w-3 h-3" />
                          <span>Quiz Available</span>
                        </span>
                      )}

                      {item.status === "quiz_unavailable" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>Quiz Pending Publication</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white pt-1">
                      {item.webinar_title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-slate-400 pt-0.5">
                      <span>Faculty: <strong className="text-gray-700 dark:text-slate-300">{item.speaker_name}</strong></span>
                      <span>•</span>
                      <span>Event Date: <strong className="text-gray-700 dark:text-slate-300">{fmtDate(item.event_date)}</strong></span>
                    </div>
                  </div>

                  {/* Status-Specific Actions */}
                  <div className="shrink-0 pt-2 sm:pt-0">
                    {item.status === "passed" && cert && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/${countryCode}/certificates/${cert.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 shadow-xs transition-all"
                        >
                          <Printer className="w-3.5 h-3.5 text-gray-500" />
                          <span>View / Print</span>
                        </Link>

                        <a
                          href={`/api/certificates/${cert.id}/download`}
                          download
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </a>
                      </div>
                    )}

                    {item.status === "upcoming" && (
                      <div className="text-right sm:text-right">
                        <span className="text-[11px] text-gray-400 block">Quiz unlocks post-broadcast</span>
                        <Link
                          href={`/${countryCode}/dashboard?tab=live`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 mt-1"
                        >
                          <span>Open Live Portal</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}

                    {item.status === "cooldown" && (
                      <div className="text-left sm:text-right">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                          <Clock className="w-3.5 h-3.5 animate-pulse" />
                          <span>Retake in {formatCountdown(cooldownLeft)}</span>
                        </div>
                        <Link
                          href={`/${countryCode}/dashboard?tab=downloads`}
                          className="text-[11px] text-gray-400 hover:text-blue-600 underline block mt-1"
                        >
                          Review Study Slides
                        </Link>
                      </div>
                    )}

                    {(item.status === "quiz_ready" || item.status === "retake_ready") && (
                      <Link
                        href={`/${countryCode}/dashboard/quiz/${item.webinar_id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                      >
                        <span>Take Comprehension Quiz</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {item.status === "quiz_unavailable" && (
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-gray-400 block">Evaluation Under Preparation</span>
                        <span className="text-xs text-slate-500 font-semibold">Available soon</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Guidance Footer on Passed items */}
                {item.status === "passed" && cert && (
                  <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400">
                    <span>
                      Certificate ID: <strong className="font-mono text-gray-600 dark:text-slate-300">{cert.certificate_number}</strong>
                    </span>
                    <span>Issued: {fmtDate(cert.issue_date)}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 3. Regulatory CPE Compliance Guidance Box */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>NASBA & IRS Continuing Education Regulatory Standards</span>
        </div>
        <p className="leading-relaxed">
          In accordance with the Statement on Standards for Continuing Professional Education (CPE) Programs, participants must achieve a minimum evaluation score of <strong>75%</strong> on post-webinar comprehension assessments. To maintain regulatory integrity, participants who do not meet the passing threshold on an attempt must complete a mandatory <strong>60-minute cooling period</strong> before attempting the quiz again.
        </p>
      </div>
    </div>
  )
}
