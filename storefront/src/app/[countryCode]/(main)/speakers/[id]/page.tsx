import React from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import {
  Award,
  BookOpen,
  Building2,
  ChevronRight,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  ArrowLeft,
  Video,
  FileText,
  Calendar,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { getSpeakerById, WebinarItem } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string; id: string }>
}): Promise<Metadata> {
  const { id } = await props.params
  const speaker = await getSpeakerById(id)

  if (!speaker) {
    return {
      title: "Faculty Member Not Found | AcademyIO",
    }
  }

  const credentialsStr = speaker.qualifications ? ` (${speaker.qualifications})` : ""
  return {
    title: `${speaker.name}${credentialsStr} | AcademyIO Faculty Profile`,
    description:
      speaker.bio ||
      `Learn from ${speaker.name}, ${speaker.designation || "instructor"} at AcademyIO. Explore upcoming webinars, self-study recordings, and accredited CPE courses.`,
  }
}

export default async function SpeakerProfilePage(props: {
  params: Promise<{ countryCode: string; id: string }>
}) {
  const { countryCode, id } = await props.params
  const speaker = await getSpeakerById(id)

  if (!speaker) {
    notFound()
  }

  const webinars = (speaker.webinars || []) as WebinarItem[]

  // Separate upcoming and self-study webinars
  const upcomingWebinars = webinars.filter((w) => w.is_upcoming)
  const selfStudyWebinars = webinars.filter((w) => !w.is_upcoming || w.is_ondemand || w.has_recording)

  const credentials = speaker.qualifications
    ? speaker.qualifications.split(",").map((q) => q.trim()).filter(Boolean)
    : []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb Navigation & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href={`/${countryCode}/speakers`}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Faculty & Speakers
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 dark:text-slate-200 font-semibold truncate max-w-xs">{speaker.name}</span>
        </nav>

        <Link
          href={`/${countryCode}/speakers`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Faculty</span>
        </Link>
      </div>

      {/* Speaker Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
          {/* Avatar */}
          <div className="relative shrink-0 mx-auto md:mx-0">
            {speaker.photo_url ? (
              <img
                src={speaker.photo_url}
                alt={speaker.name}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl object-cover border-4 border-gray-100 dark:border-slate-800 shadow-md"
              />
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-slate-900 text-white flex items-center justify-center font-extrabold text-4xl sm:text-5xl shadow-md">
                {speaker.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white px-2.5 py-1 rounded-full border-2 border-white dark:border-slate-900 shadow-xs flex items-center gap-1 text-[11px] font-bold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Verified Faculty</span>
            </div>
          </div>

          {/* Details & Credentials */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            {/* Credentials Pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {credentials.length > 0 ? (
                credentials.map((cred, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  >
                    {cred}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Accredited Instructor
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                <ShieldCheck className="w-3.5 h-3.5" />
                NASBA Aligned
              </span>
            </div>

            {/* Name */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
              {speaker.name}
            </h1>

            {/* Title / Designation */}
            <p className="text-base sm:text-lg font-semibold text-gray-700 dark:text-slate-300">
              {speaker.designation || speaker.title || "Distinguished Instructor & Subject Matter Expert"}
            </p>

            {/* Company / Firm */}
            {speaker.company && (
              <p className="text-sm text-gray-600 dark:text-slate-400 flex items-center justify-center md:justify-start gap-2">
                <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="font-medium">{speaker.company}</span>
              </p>
            )}

            {/* Quick Metrics Bar */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-center md:justify-start gap-6 text-xs text-gray-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>CPE Continuing Education</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-500" />
                <span>Live Interactive & Self-Study</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span>Accredited Faculty</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Biography & Professional Background Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              Biography & Professional Experience
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Background, credentials, and subject matter practice
            </p>
          </div>
        </div>

        {speaker.bio ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
            {speaker.bio}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed italic">
            {speaker.name} is a distinguished faculty member at AcademyIO, providing accredited continuing education
            seminars and compliance guidance for tax, accounting, and finance practitioners.
          </p>
        )}

        {/* Practice Highlights */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-gray-900 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Practice Focus
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Federal & State Taxation, Corporate Governance, Financial Reporting Compliance
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-gray-900 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Instruction Format
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Interactive Q&A Broadcasts, Case Study Analysis, Comprehensive Handouts
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-gray-900 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Continuing Education
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-[11px] leading-relaxed">
              NASBA Registry of CPE Sponsors Aligned Courses with Verified Credit Issuance
            </p>
          </div>
        </div>
      </div>

      {/* Webinars & Courses Taught by this Speaker */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              <BookOpen className="w-4 h-4" />
              Course Catalog
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">
              Webinars & Programs by {speaker.name}
            </h2>
          </div>
        </div>

        {webinars.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              Upcoming Courses in Development
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              New continuing education broadcasts and self-study programs led by {speaker.name} are currently being
              scheduled. In the meantime, explore our comprehensive course catalog.
            </p>
            <div className="pt-2">
              <Link
                href={`/${countryCode}/webinars`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <span>Browse All Webinars</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {webinars.map((webinar) => (
              <WebinarCard key={webinar.id} webinar={webinar} countryCode={countryCode} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
