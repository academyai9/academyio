import React from "react"
import Link from "next/link"
import { Metadata } from "next"
import { Award, GraduationCap, ShieldCheck, ChevronRight, Mail, Users, Sparkles } from "lucide-react"
import { getStoreSpeakers } from "@lib/data/webinars"
import SpeakerDirectory from "@/components/speakers/SpeakerDirectory"

export const metadata: Metadata = {
  title: "Faculty & Speakers Directory | AcademyIO Continuing Professional Education",
  description:
    "Meet our distinguished roster of CPAs, Tax Attorneys, Controllers, Enrolled Agents, and industry practitioners leading accredited continuing education webinars.",
}

export default async function SpeakersPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const speakers = await getStoreSpeakers()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-slate-200 font-semibold">Faculty & Speakers</span>
      </nav>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            Distinguished Faculty & Instructors
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Learn From Industry Authorities & Regulatory Experts
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
            Our courses are designed and delivered by practicing CPAs, senior tax counsels, former IRS officials, and
            CFOs who translate complex laws and accounting standards into actionable strategies.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-gray-300">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
              <Award className="w-4 h-4 text-amber-400" />
              NASBA Aligned CPE Instructors
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Credentials & Vetted Practice
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              Over 500+ Hours of Practical Guidance
            </span>
          </div>
        </div>
      </div>

      {/* Main Speakers Directory (Search + Filters + Grid) */}
      <SpeakerDirectory speakers={speakers} countryCode={countryCode} />

      {/* Join Faculty Call to Action Banner */}
      <div className="rounded-2xl bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Join Our Teaching Roster
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">
            Are You a Subject Matter Authority?
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 max-w-xl">
            Share your expertise with thousands of CPAs, attorneys, and financial professionals across the country.
            We provide full webinar production, marketing, and CPE accreditation support.
          </p>
        </div>

        <Link
          href={`/${countryCode}/contact`}
          className="shrink-0 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
        >
          Inquire to Speak
        </Link>
      </div>
    </div>
  )
}
