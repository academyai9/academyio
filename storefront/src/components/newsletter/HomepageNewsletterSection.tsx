import React from "react"
import { Mail, Sparkles, CheckCircle, ShieldCheck } from "lucide-react"
import NewsletterSubscribeForm from "./NewsletterSubscribeForm"

export default function HomepageNewsletterSection({ countryCode = "us" }: { countryCode?: string }) {
  return (
    <section className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Continuing Professional Education</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Stay Updated with AcademyIO
            </h2>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Receive updates about upcoming webinars, new courses, professional education, and special offers.
              Never miss a regulatory update or accredited CPE deadline.
            </p>

            <div className="space-y-3 pt-2 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Monthly calendar of live IRS & NASBA compliant webinars</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Curated analysis of corporate tax law and GAAP standard shifts</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Exclusive subscriber discounts on course bundles & annual subscriptions</span>
              </div>
            </div>
          </div>

          {/* Right Column: Form Card */}
          <div className="lg:col-span-6">
            <NewsletterSubscribeForm
              countryCode={countryCode}
              source="homepage_section"
              variant="card"
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
