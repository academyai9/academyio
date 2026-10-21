"use client"

import React from "react"
import Link from "next/link"
import { Award, Download, Printer, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react"

export interface CertificateDetails {
  id: string
  certificate_number: string
  customer_name: string
  customer_email?: string
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

export default function CertificateView({
  certificate,
  countryCode,
}: {
  certificate: CertificateDetails
  countryCode: string
}) {
  const handlePrint = () => {
    window.print()
  }

  const fmtDate = (d?: string | null) => {
    if (!d) return "October 2026"
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return String(d)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      {/* Control Navigation Header (Hidden when printing) */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <Link
          href={`/${countryCode}/dashboard?tab=certificates`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Certificates</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Certificate</span>
          </button>

          <a
            href={`/api/certificates/${certificate.id}/download`}
            download
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Main Certificate Frame */}
      <div className="max-w-5xl mx-auto bg-white text-slate-900 rounded-2xl shadow-xl print:shadow-none print:rounded-none overflow-hidden border border-slate-200 print:border-none">
        {/* Certificate Landscape Canvas */}
        <div className="relative p-10 sm:p-14 lg:p-16 border-8 border-slate-900 bg-[#fdfbf7] print:border-[6px] print:border-slate-900 print:p-8">
          {/* Inner Inset Gold Border */}
          <div className="border-2 border-amber-600/80 p-8 sm:p-10 relative">
            {/* Corner Decorative Accents */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-500" />

            {/* Header: Organization & Registry */}
            <div className="text-center space-y-1.5 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-[10px] font-extrabold tracking-widest uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Verified Continuing Education Registry</span>
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-black tracking-wider text-slate-900 uppercase">
                {certificate.issuer_name || "AcademyIO Continuing Professional Education"}
              </h2>
              <p className="text-xs text-slate-500 tracking-wide font-medium">
                National Registry of CPE Sponsors • IRS Approved Continuing Education Provider
              </p>
            </div>

            {/* Title: Certificate of Participation */}
            <div className="text-center my-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-amber-700 tracking-tight">
                Certificate of Participation
              </h1>
              <div className="w-36 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-2" />
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mt-1.5">
                Official Continuing Education Verification
              </p>
            </div>

            {/* Recipient Details */}
            <div className="text-center my-6 space-y-2">
              <p className="text-xs sm:text-sm font-serif italic text-slate-600">
                This is to officially certify that
              </p>
              <div className="inline-block relative">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900 tracking-tight pb-1 px-6">
                  {certificate.customer_name}
                </h3>
                <div className="w-full h-0.5 bg-amber-600/70 mx-auto" />
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto pt-2 leading-relaxed">
                has successfully attended the accredited live educational program and demonstrated mastery on the comprehensive post-webinar CPE evaluation for:
              </p>
            </div>

            {/* Course Title & Faculty */}
            <div className="text-center my-6 p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 max-w-3xl mx-auto">
              <h4 className="text-base sm:text-lg font-serif font-bold text-slate-900">
                {certificate.webinar_title}
              </h4>
              <p className="text-xs text-slate-500 font-serif italic mt-1">
                Presented by: <span className="font-semibold text-slate-700">{certificate.speaker_name || "AcademyIO Faculty"}</span>
              </p>
            </div>

            {/* Verification & Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto my-6 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Completion</span>
                <span className="font-bold text-slate-800">{fmtDate(certificate.event_date || certificate.issue_date)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">CPE Hours Awarded</span>
                <span className="font-bold text-amber-700">{certificate.cpe_credits} Credit Hours</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Evaluation Score</span>
                <span className="font-bold text-emerald-700">{certificate.score_percentage}% (Passing: 75%)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Certificate ID</span>
                <span className="font-mono font-bold text-slate-800">{certificate.certificate_number}</span>
              </div>
            </div>

            {/* Signatures & Seal */}
            <div className="pt-6 mt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 items-center gap-6 text-center sm:text-left">
              {/* Left Signatory */}
              <div>
                <div className="w-44 border-b border-slate-400 pb-1 mb-1.5 mx-auto sm:mx-0">
                  <span className="font-serif italic text-sm text-slate-800 font-semibold">
                    {certificate.signatory_name || certificate.speaker_name || "Faculty Dean"}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-800">
                  {certificate.signatory_name || certificate.speaker_name || "Lead Instructor"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {certificate.signatory_title || "Lead Faculty / CPE Course Director"}
                </p>
              </div>

              {/* Center Seal */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-amber-600 bg-amber-50 flex flex-col items-center justify-center shadow-inner">
                  <Award className="w-7 h-7 text-amber-700" />
                  <span className="text-[8px] font-black uppercase text-amber-900 tracking-tighter mt-0.5">CPE SEAL</span>
                </div>
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">Official Audit Seal</span>
              </div>

              {/* Right Verification */}
              <div className="sm:text-right">
                <div className="w-44 border-b border-slate-400 pb-1 mb-1.5 mx-auto sm:ml-auto sm:mr-0">
                  <span className="font-serif italic text-sm text-slate-800 font-semibold">
                    Dr. Jennifer Ross, CPA
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-800">Academic Director & Compliance Dean</p>
                <p className="text-[10px] text-slate-500">Issued: {fmtDate(certificate.issue_date)}</p>
              </div>
            </div>

            {/* Bottom Regulatory Disclaimer */}
            <div className="mt-8 pt-4 border-t border-slate-200/80 text-center text-[9px] text-slate-400 leading-normal">
              In accordance with the standards of the National Registry of CPE Sponsors and IRS Continuing Education Provider Guidelines.
              Official verification record maintained on file by AcademyIO Continuing Professional Education.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
