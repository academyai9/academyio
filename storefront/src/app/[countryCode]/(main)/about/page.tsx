import React from "react"
import { Award, ShieldCheck, BookOpen, Users, CheckCircle2 } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
      <div className="max-w-3xl">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Our Mission & Standards</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-1 leading-tight">
          Practical, Authoritative Education Built for Modern Financial Practitioners
        </h1>
        <p className="text-base text-gray-600 mt-4 leading-relaxed">
          AcademyIO was founded to eliminate generic, theoretical continuing education. We partner with the
          nation's most experienced tax practitioners, former Big 4 audit managers, and specialized attorneys
          to deliver high-impact courses that address genuine day-to-day regulatory and calculation challenges.
        </p>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">Rigorous Instructor Vetting</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Every instructor is a practicing subject matter authority with proven teaching ability, published works,
            or extensive forensic experience in their given discipline.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">Actionable Course Assets</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            We don't just provide lectures; we deliver downloadable decision trees, excel calculation models,
            verbatim transcripts, and comprehensive practice handbooks.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">Guaranteed Compliance</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            All programs adhere to strict NASBA and state accountancy board standards for interactive polling,
            attendance verification, and instantaneous certificate generation.
          </p>
        </div>
      </div>

      {/* Standards List */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-6">
        <h2 className="text-2xl font-bold">Our Quality Commitment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero sponsored content or vendor sales pitches</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Updated annually for current IRS forms and Treasury regulations</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted, secure video streaming and customer content storage</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Instant delivery of certificates and purchase receipts</span>
          </div>
        </div>
      </div>
    </div>
  )
}
