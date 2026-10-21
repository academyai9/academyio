import React from "react"
import Link from "next/link"
import { Metadata } from "next"
import {
  ShieldCheck,
  Clock,
  RefreshCw,
  Mail,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Calendar,
  HelpCircle,
} from "lucide-react"
import { getRefundPolicy } from "@lib/data/policy"

export const metadata: Metadata = {
  title: "Refund Policy | AcademyIO",
  description:
    "Official AcademyIO Refund Policy: terms, cancellation deadlines, credit-note validity, rescheduling, and access to live and on-demand webinar recordings.",
  openGraph: {
    title: "Refund Policy | AcademyIO",
    description:
      "Review the cancellation terms, refund rules, and credit note guidelines for AcademyIO continuing education webinars.",
  },
}

export default async function RefundPolicyPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const policy = await getRefundPolicy()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-slate-200 font-semibold">Refund Policy</span>
      </nav>

      {/* Hero Header */}
      <header className="space-y-4 border-b border-gray-200 dark:border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Customer Learning Guarantee & Terms</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
          {policy.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Effective Date: {policy.effective_date}
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            Version {policy.version}
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Mail className="w-3.5 h-3.5 text-purple-500" />
            Support: <a href={`mailto:${policy.support_email}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">{policy.support_email}</a>
          </span>
        </div>

        <p className="text-sm sm:text-base text-gray-700 dark:text-slate-300 leading-relaxed max-w-4xl pt-2">
          {policy.subtitle}
        </p>
      </header>

      {/* Summary Highlight Table */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-850 dark:to-slate-800 px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider">
              Summary of Key Cancellation & Refund Terms
            </h2>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-slate-400 hidden sm:inline">
            Quick reference guide
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 dark:text-slate-300">
            <thead className="bg-gray-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Situation</th>
                <th className="py-3.5 px-6">Resolution / Credit Rule</th>
                <th className="py-3.5 px-6">Required Notification Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {policy.summary_rules.map((rule, idx) => (
                <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-gray-900 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{rule.situation}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 leading-relaxed">
                    {rule.resolution}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
                      {rule.timeline}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Main Numbered Sections Content */}
      <main className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm space-y-10 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
        {policy.sections.map((section) => (
          <article
            key={section.id}
            id={`section-${section.number}`}
            className="space-y-3.5 pb-8 border-b border-gray-100 dark:border-slate-800 last:border-0 last:pb-0 scroll-mt-20"
          >
            <div className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {section.number}
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
                  {section.number}. {section.title}
                </h2>
                {section.subtitle && (
                  <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">
                    {section.subtitle}
                  </h3>
                )}
              </div>
            </div>

            <div className="space-y-3 pl-10">
              {section.content.map((paragraph, pIdx) => (
                <p key={pIdx} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}

              {section.items && section.items.length > 0 && (
                <div className="my-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 space-y-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-slate-200 block">
                    Information to Include in Your Email Request:
                  </span>
                  <ul className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                    {section.items.map((item, iIdx) => (
                      <li key={iIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {section.followup && (
                <p className="text-xs font-medium text-gray-600 dark:text-slate-400 pt-1">
                  {section.followup}
                </p>
              )}
            </div>
          </article>
        ))}
      </main>

      {/* Support Action Callout Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Need Assistance with a Registration?</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Contact AcademyIO Support
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
            Our support team reviews customer concerns promptly and fairly. If you need to request a credit note,
            verify email delivery, or report a scheduling conflict, reach out anytime.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            href={`mailto:${policy.support_email}`}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Email {policy.support_email}</span>
          </a>
          <Link
            href={`/${countryCode}/contact`}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
          >
            Contact Center
          </Link>
        </div>
      </section>
    </div>
  )
}
