import React from "react"
import Link from "next/link"
import { Metadata } from "next"
import {
  Scale,
  FileText,
  ShieldCheck,
  ChevronRight,
  Calendar,
  Mail,
  BookOpen,
  Users,
  CheckCircle2,
  Lock,
  AlertCircle,
  HelpCircle,
  Award,
} from "lucide-react"
import { getTermsConditions } from "@lib/data/terms"

export const metadata: Metadata = {
  title: "Terms & Conditions | AcademyIO",
  description:
    "Official Terms & Conditions governing access to and use of AcademyIO training programs, live webinars, on-demand courses, digital resources, and membership subscriptions.",
  openGraph: {
    title: "Terms & Conditions | AcademyIO",
    description:
      "Review the terms of service, membership rights, intellectual property rules, and educational policies for AcademyIO.",
  },
}

export default async function TermsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const terms = await getTermsConditions()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-slate-200 font-semibold">Terms & Conditions</span>
      </nav>

      {/* Hero Header */}
      <header className="space-y-4 border-b border-gray-200 dark:border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
          <Scale className="w-3.5 h-3.5" />
          <span>Legal Governance & User Agreement</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
          {terms.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Last Updated: {terms.last_updated}
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Binding Educational Agreement
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Mail className="w-3.5 h-3.5 text-purple-500" />
            Inquiries: <a href={`mailto:${terms.support_email}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">{terms.support_email}</a>
          </span>
        </div>

        {/* Lead Introduction Box */}
        <div className="bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed mt-4">
          {terms.lead_paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </header>

      {/* Quick Jump Table of Contents */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-slate-100">
            Table of Contents & Quick Navigation
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {terms.sections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50"
            >
              <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                {sec.number}
              </span>
              <span className="truncate">{sec.title}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Main Sections Content */}
      <main className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm space-y-12 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
        {terms.sections.map((section) => (
          <article
            key={section.id}
            id={section.id}
            className="space-y-4 pb-10 border-b border-gray-100 dark:border-slate-800 last:border-0 last:pb-0 scroll-mt-20"
          >
            {/* Section Header */}
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                {section.number}
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">
                  {section.number}. {section.title}
                </h2>
              </div>
            </div>

            {/* Direct Section Content (e.g. Section 5, 7, 8, 11, 12, 13, 15) */}
            {section.content && section.content.length > 0 && (
              <div className="space-y-3 pl-11">
                {section.content.map((p, idx) => {
                  // Check if paragraph mentions Refund Policy or Privacy Policy
                  const isRefundPolicyMention = p.includes("Refund Policy")
                  const isPrivacyPolicyMention = p.includes("Privacy Policy")

                  return (
                    <p key={idx} className="leading-relaxed">
                      {isRefundPolicyMention && !p.includes("Refund Policy and the terms") ? (
                        <>
                          {p.split("Refund Policy")[0]}
                          <Link
                            href={`/${countryCode}/refund-policy`}
                            className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            Refund Policy
                          </Link>
                          {p.split("Refund Policy")[1]}
                        </>
                      ) : isPrivacyPolicyMention ? (
                        <>
                          {p.split("Privacy Policy")[0]}
                          <Link
                            href={`/${countryCode}/privacy`}
                            className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            Privacy Policy
                          </Link>
                          {p.split("Privacy Policy")[1]}
                        </>
                      ) : p.includes(terms.support_email) ? (
                        <>
                          {p.split(terms.support_email)[0]}
                          <a
                            href={`mailto:${terms.support_email}`}
                            className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2"
                          >
                            {terms.support_email}
                          </a>
                          {p.split(terms.support_email)[1]}
                        </>
                      ) : (
                        p
                      )}
                    </p>
                  )
                })}
              </div>
            )}

            {/* Subsections (e.g. 1.1, 1.2, 2.1, 3.1, etc.) */}
            {section.subsections && (
              <div className="space-y-6 pl-11 pt-1">
                {section.subsections.map((sub) => (
                  <div key={sub.number} className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">{sub.number}</span>
                      <span>{sub.title}</span>
                    </h3>

                    <div className="space-y-2 pl-6 border-l-2 border-gray-100 dark:border-slate-800">
                      {sub.content.map((p, pIdx) => {
                        const hasRefundPolicy = p.includes("Refund Policy")
                        const hasSupportEmail = p.includes(terms.support_email)

                        return (
                          <p key={pIdx} className="leading-relaxed">
                            {hasRefundPolicy ? (
                              <>
                                {p.split("Refund Policy")[0]}
                                <Link
                                  href={`/${countryCode}/refund-policy`}
                                  className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                  Refund Policy
                                </Link>
                                {p.split("Refund Policy")[1]}
                              </>
                            ) : hasSupportEmail ? (
                              <>
                                {p.split(terms.support_email)[0]}
                                <a
                                  href={`mailto:${terms.support_email}`}
                                  className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2"
                                >
                                  {terms.support_email}
                                </a>
                                {p.split(terms.support_email)[1]}
                              </>
                            ) : (
                              p
                            )}
                          </p>
                        )
                      })}

                      {sub.items && (
                        <ul className="space-y-1.5 pt-1.5 text-xs">
                          {sub.items.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </main>

      {/* Acceptance of Terms Callout Box */}
      <section className="rounded-2xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Acceptance of These Terms</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          {terms.acceptance_statement}
        </p>
      </section>

      {/* Contact & Support Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Questions Regarding Our Legal Terms?</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            AcademyIO Support & Legal Inquiries
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
            Our team is committed to transparency. If you have questions regarding membership rights, enterprise licenses,
            or course access, reach out anytime.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            href={`mailto:${terms.support_email}`}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Email {terms.support_email}</span>
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
