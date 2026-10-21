import React from "react"
import Link from "next/link"
import { Metadata } from "next"
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Mail,
  Calendar,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Eye,
  FileText,
  Server,
  AlertTriangle,
} from "lucide-react"
import { getPrivacyPolicy, PrivacyHighlight } from "@lib/data/privacy"

export const metadata: Metadata = {
  title: "Privacy Policy | AcademyIO",
  description:
    "Official AcademyIO Privacy Policy: how we collect, use, store, disclose, and protect your personal information across our website, webinars, courses, and educational services.",
  openGraph: {
    title: "Privacy Policy | AcademyIO",
    description:
      "Understand your privacy rights, data security standards, and personal data management policies at AcademyIO.",
  },
}

function HighlightIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "Lock":
      return <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    case "UserCheck":
      return <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
    case "Mail":
      return <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
    case "ShieldCheck":
    default:
      return <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  }
}

export default async function PrivacyPolicyPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const policy = await getPrivacyPolicy()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-slate-200 font-semibold">Privacy Policy</span>
      </nav>

      {/* Hero Header */}
      <header className="space-y-4 border-b border-gray-200 dark:border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Data Protection & Privacy Commitment</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
          {policy.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            Last Updated: {policy.last_updated}
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            Version {policy.version}.0
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Mail className="w-3.5 h-3.5 text-purple-500" />
            Privacy Inquiries:{" "}
            <a href={`mailto:${policy.support_email}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              {policy.support_email}
            </a>
          </span>
        </div>

        {/* Lead Introduction Box */}
        <div className="bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed mt-4">
          {policy.lead_paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </header>

      {/* Highlights / Guarantees Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {policy.highlights.map((h, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-2 hover:border-blue-300 dark:hover:border-blue-900/60 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
              <HighlightIcon icon={h.icon} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-slate-100">
              {h.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
              {h.description}
            </p>
          </div>
        ))}
      </section>

      {/* Quick Jump Table of Contents */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-slate-100">
            Table of Contents & Quick Navigation
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {policy.sections.map((sec) => (
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
        {policy.sections.map((section) => (
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {section.number}. {section.title}
                </h2>
              </div>
            </div>

            {/* Intro text */}
            {section.intro && (
              <p className="text-gray-800 dark:text-slate-200 font-medium">
                {section.intro}
              </p>
            )}

            {/* Bullet List */}
            {section.items && (
              <ul className="space-y-2 pl-2">
                {section.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Paragraphs */}
            {section.content && section.content.length > 0 && (
              <div className="space-y-3 pt-1">
                {section.content.map((p, idx) => {
                  const hasEmail = p.includes(policy.support_email)
                  return (
                    <p key={idx} className="leading-relaxed">
                      {hasEmail ? (
                        <>
                          {p.split(policy.support_email)[0]}
                          <a
                            href={`mailto:${policy.support_email}`}
                            className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            {policy.support_email}
                          </a>
                          {p.split(policy.support_email)[1]}
                        </>
                      ) : (
                        p
                      )}
                    </p>
                  )
                })}
              </div>
            )}

            {/* Contextual Callout for Account Deletion (Section 4) */}
            {section.number === 4 && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p>
                  <strong>Account Deletion Notice:</strong> Submitting an account deletion request permanently restricts access to your digital resource library and certificate verification histories. Certain transactional logs are legally retained for tax and audit compliance.
                </p>
              </div>
            )}

            {/* Contextual Callout for Payment Security (Section 7) */}
            {section.number === 7 && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <p>
                  <strong>PCI-DSS Certified Security:</strong> All card payments are tokenized directly through certified payment gateways (such as Stripe). AcademyIO servers never transmit or store raw credit card credentials.
                </p>
              </div>
            )}

            {/* Contextual Callout for Privacy Rights (Section 11) */}
            {section.number === 11 && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
                <UserCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p>
                  <strong>Exercising Your Rights:</strong> Contact us at{" "}
                  <a href={`mailto:${policy.support_email}`} className="font-bold underline">
                    {policy.support_email}
                  </a>{" "}
                  with the subject line <em>"Privacy Rights Request"</em>. We verify identity and respond within standard statutory timeframes.
                </p>
              </div>
            )}
          </article>
        ))}
      </main>

      {/* Contact & Legal Support Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Have Privacy or Data Protection Questions?</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            AcademyIO Data Protection & Support
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
            We are dedicated to safeguarding your personal data and ensuring full transparency. For rights requests, policy inquiries, or data reviews, our team is here to assist.
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
            href={`/${countryCode}/terms`}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
          >
            Terms & Conditions
          </Link>
        </div>
      </section>
    </div>
  )
}
