import React from "react"
import Link from "next/link"
import { Metadata } from "next"
import {
  Cookie,
  ShieldCheck,
  Lock,
  Sliders,
  Calendar,
  ChevronRight,
  FileText,
  Mail,
  Info,
  CheckCircle2,
} from "lucide-react"
import { OFFICIAL_COOKIE_POLICY } from "@lib/data/cookies-policy"
import OpenCookiePreferencesButton from "@/components/cookies/OpenCookiePreferencesButton"

export const metadata: Metadata = {
  title: "Cookie Policy & Preferences | AcademyIO",
  description:
    "Official AcademyIO Cookie Policy: understand how we use cookies, tracking technologies, analytics, and how you can control your cookie preferences.",
  openGraph: {
    title: "Cookie Policy & Preferences | AcademyIO",
    description:
      "Full transparency on cookies, tracking technologies, and personal preference management on AcademyIO.",
  },
}

export default async function CookiePolicyPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const policy = OFFICIAL_COOKIE_POLICY

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-slate-200 font-semibold">Cookie Policy</span>
      </nav>

      {/* Hero Header */}
      <header className="space-y-6 border-b border-gray-200 dark:border-slate-800 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Cookie className="w-3.5 h-3.5" />
            <span>Transparency & Privacy Standards</span>
          </div>

          <OpenCookiePreferencesButton />
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
        <div className="bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 space-y-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          {policy.lead_paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </header>

      {/* Interactive Preference Control Card */}
      <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold">
            <Sliders className="w-3.5 h-3.5" />
            <span>Interactive Consent Manager</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Want to change your cookie settings?
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            You can customize, review, or withdraw your cookie choices at any time without affecting your ability to browse accredited courses or access purchased webinar materials.
          </p>
        </div>
        <OpenCookiePreferencesButton className="bg-white text-blue-900 hover:bg-blue-50 shrink-0">
          Open Preferences Center
        </OpenCookiePreferencesButton>
      </section>

      {/* Cookie Categories Details */}
      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
            Cookies We Use on AcademyIO
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            The table below classifies the specific first-party and third-party cookies active on our platform by purpose, provider, and retention lifespan.
          </p>
        </div>

        <div className="space-y-6">
          {policy.categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
            >
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gray-50/60 dark:bg-slate-850/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {cat.required ? (
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {cat.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-2xl">
                    {cat.description}
                  </p>
                </div>
                <div>
                  {cat.required ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                      Always Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-bold">
                      Configurable
                    </span>
                  )}
                </div>
              </div>

              {/* Cookies Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300 font-semibold border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4 font-bold">Cookie Name</th>
                      <th className="py-3 px-4 font-bold">Provider</th>
                      <th className="py-3 px-4 font-bold">Purpose</th>
                      <th className="py-3 px-4 font-bold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                    {cat.cookies.map((c) => (
                      <tr key={c.name} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {c.name}
                        </td>
                        <td className="py-3 px-4 font-medium">{c.provider}</td>
                        <td className="py-3 px-4 leading-relaxed">{c.purpose}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-500 dark:text-slate-400">
                          {c.expiry}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Policy Sections */}
      <section className="space-y-8 pt-4 border-t border-gray-200 dark:border-slate-800">
        {policy.sections.map((section) => (
          <div key={section.id} id={section.id} className="space-y-3">
            <h2 className="text-xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
              {section.title}
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
              {section.content.map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Footer Banner */}
      <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-center space-y-3">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          For more details on how AcademyIO safeguards personal data and respects user rights, please review our{" "}
          <Link href={`/${countryCode}/privacy`} className="text-blue-600 dark:text-blue-400 underline font-semibold">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href={`/${countryCode}/terms`} className="text-blue-600 dark:text-blue-400 underline font-semibold">
            Terms & Conditions
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
