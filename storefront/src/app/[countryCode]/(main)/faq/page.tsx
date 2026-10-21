import React from "react"
import Link from "next/link"
import { Metadata } from "next"
import {
  HelpCircle,
  ChevronRight,
  Mail,
  Calendar,
  Sparkles,
  Layers,
  BookOpen,
  Award,
  CreditCard,
  MessageCircle,
} from "lucide-react"
import { getFaqs } from "@lib/data/faqs"
import FaqAccordion from "@modules/faq/components/FaqAccordion"

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQs) | AcademyIO",
  description:
    "Find answers to common questions about AcademyIO live webinars, on-demand training, single-user recording licenses, transcripts, registration, payments, CPE credits, and course materials.",
  openGraph: {
    title: "Frequently Asked Questions (FAQs) | AcademyIO",
    description:
      "Everything you need to know about attending webinars, downloading study guides, earning accredited CPE credits, and managing your purchases at AcademyIO.",
  },
}

export default async function FAQPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const faqs = await getFaqs()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-slate-200 font-semibold">FAQs</span>
      </nav>

      {/* Hero Header */}
      <header className="space-y-4 border-b border-gray-200 dark:border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>AcademyIO Help Center & Knowledge Base</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
          {faqs.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            {faqs.items.length} Questions Answered
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            Last Updated: {faqs.last_updated}
          </span>
          <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md">
            <Mail className="w-3.5 h-3.5 text-purple-500" />
            Support:{" "}
            <a
              href={`mailto:${faqs.support_email}`}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              {faqs.support_email}
            </a>
          </span>
        </div>

        <div className="bg-blue-50/50 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 text-sm text-gray-700 dark:text-slate-300 leading-relaxed mt-4">
          <p>{faqs.subtitle}</p>
        </div>
      </header>

      {/* Quick Topic Shortcuts */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="#faq-1"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all shadow-sm space-y-1.5 block group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Webinar Formats
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Live sessions, on-demand, single licenses, transcripts & downloads.
          </p>
        </a>

        <a
          href="#faq-6"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-sm space-y-1.5 block group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
            Registration & Access
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            How to register, joining links, attendance, and colleague transfers.
          </p>
        </a>

        <a
          href="#faq-10"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all shadow-sm space-y-1.5 block group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
            <Award className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
            CPE Credits & Q&A
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Credit eligibility rules, polling verification, and asking questions.
          </p>
        </a>

        <a
          href="#faq-13"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-pink-300 dark:hover:border-pink-800 transition-all shadow-sm space-y-1.5 block group"
        >
          <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400">
            Payments & Refunds
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Accepted cards, PayPal checkout, and cancellation procedures.
          </p>
        </a>
      </section>

      {/* Interactive Accordion with Live Search & Filtering */}
      <section>
        <FaqAccordion
          items={faqs.items}
          countryCode={countryCode}
          supportEmail={faqs.support_email}
        />
      </section>

      {/* Still Have Questions? Support Banner */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-10 border border-slate-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <MessageCircle className="w-4 h-4" />
            <span>Still Have Questions?</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            We're Here to Help You Succeed
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
            Contact AcademyIO at{" "}
            <a
              href={`mailto:${faqs.support_email}`}
              className="text-white font-semibold underline underline-offset-2"
            >
              {faqs.support_email}
            </a>
            , and our dedicated support team will help you with registration, payments, webinar access, course materials, or technical troubleshooting.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            href={`mailto:${faqs.support_email}`}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Email {faqs.support_email}</span>
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
