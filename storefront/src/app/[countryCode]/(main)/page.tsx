import React from "react"
import Link from "next/link"
import { Award, Calendar, Video, FileText, Download, Sparkles, CheckCircle, ArrowRight, ShieldCheck, Users, BookOpen } from "lucide-react"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"

export default async function HomePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const { webinars } = await getWebinars({ limit: 6 })

  const upcomingWebinars = webinars.filter((w) => w.is_upcoming).slice(0, 3)
  const onDemandWebinars = webinars.filter((w) => w.is_ondemand).slice(0, 3)

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-7xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/60 border border-blue-700/50 text-blue-300 text-xs font-semibold backdrop-blur-md">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Accredited Continuing Professional Education (CPE) & Webinars
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Advance Your Expertise With Masterclass Webinars & Seminars
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Targeted instruction on IRS Form compliance, GAAP accounting updates, and corporate tax strategies.
            Select your preferred purchase option: live session, on-demand video, verbatim transcript, or study PDFs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href={`/${countryCode}/webinars/upcoming`}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Explore Upcoming Sessions
            </Link>
            <Link
              href={`/${countryCode}/webinars/on-demand`}
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              Browse On-Demand Catalog
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-800/80 text-left">
            <div>
              <span className="text-2xl font-black text-white block">100%</span>
              <span className="text-xs text-slate-400">Practical Case Studies</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white block">5 Options</span>
              <span className="text-xs text-slate-400">Live, Video, PDF & Bundles</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white block">2 - 3 CPE</span>
              <span className="text-xs text-slate-400">Credits Per Masterclass</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white block">Instant</span>
              <span className="text-xs text-slate-400">Dashboard Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Webinars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Top Recommended</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">Featured Upcoming Webinars</h2>
          </div>
          <Link
            href={`/${countryCode}/webinars`}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All Catalog ({webinars.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingWebinars.map((webinar) => (
            <WebinarCard key={webinar.id} webinar={webinar} countryCode={countryCode} />
          ))}
        </div>
      </section>

      {/* 5 Purchase Formats Explanation */}
      <section className="bg-slate-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Flexible Commerce</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Purchase Only The Formats You Need
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Every webinar supports tailored access options so you never pay for materials you don't use.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                title: "Live Webinar",
                price: "From $149",
                icon: Video,
                color: "text-blue-600 bg-blue-50 border-blue-200",
                desc: "Join real-time broadcast, interact with instructors during live Q&A, and verify CPE attendance.",
              },
              {
                title: "Recorded Webinar",
                price: "From $149",
                icon: Video,
                color: "text-emerald-600 bg-emerald-50 border-emerald-200",
                desc: "High-definition streaming accessible 24/7 from your customer dashboard with 1 year access.",
              },
              {
                title: "Webinar Transcript",
                price: "From $49",
                icon: FileText,
                color: "text-purple-600 bg-purple-50 border-purple-200",
                desc: "Verbatim written transcription of instructor presentations and participant questions.",
              },
              {
                title: "PDF Study Guide",
                price: "From $29",
                icon: Download,
                color: "text-amber-600 bg-amber-50 border-amber-200",
                desc: "Instructor slide decks, IRS calculation worksheets, and practice compliance checklists.",
              },
              {
                title: "Complete Package",
                price: "From $249",
                badge: "Best Value",
                icon: Sparkles,
                color: "text-indigo-600 bg-indigo-50 border-indigo-200",
                desc: "All-inclusive pass granting instant access to Live broadcast, Recording, Transcript, and all PDFs.",
              },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-lg ${f.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {f.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{f.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-900">{f.price}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* On-Demand Learning Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Instant Access</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">Available On-Demand Right Now</h2>
          </div>
          <Link
            href={`/${countryCode}/webinars/on-demand`}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
          >
            Browse All On-Demand Courses
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {onDemandWebinars.map((webinar) => (
            <WebinarCard key={webinar.id} webinar={webinar} countryCode={countryCode} />
          ))}
        </div>
      </section>

      {/* Leading Faculty Showcase */}
      <section className="bg-white py-16 border-y border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Faculty & Instructors</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Learn Directly From Nationally Recognized Practitioners
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Our speakers are prominent tax attorneys, authors, former Big 4 audit managers, and accounting professors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Barbara Weltman, Esq.",
                title: "Tax Attorney & Author of J.K. Lasser's Small Business Taxes",
                photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
                specialty: "S-Corporation Form 7203 & IRS Basis",
              },
              {
                name: "Greg White, CPA",
                title: "Managing Partner & Contributing Editor, Tax Practice Advisor",
                photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
                specialty: "Form 1065 & Section 704(c) Reconciliations",
              },
              {
                name: "Jennifer Louis, CPA",
                title: "President of Emeritus Consulting, Former Deloitte Audit Manager",
                photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
                specialty: "GAAP Standards Updates & ASC 606/842",
              },
              {
                name: "Dr. Amanda Chen, Ph.D., CPA",
                title: "Professor of Accounting Information Systems & Forensic Auditing",
                photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
                specialty: "Algorithmic Audit Analytics & AI Fraud Detection",
              },
            ].map((spk, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center space-y-3">
                <img
                  src={spk.photo}
                  alt={spk.name}
                  className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-white shadow-md"
                />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{spk.name}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">{spk.title}</p>
                </div>
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                    {spk.specialty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to Enroll Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold max-w-2xl mx-auto">
            Ready to Earn Your CPE Credits & Master Practical Tax Solutions?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
            Join thousands of accounting and tax professionals enrolled across our live broadcasts and on-demand programs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href={`/${countryCode}/webinars`}
              className="px-6 py-3.5 bg-white text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors shadow-md"
            >
              Browse All Webinars
            </Link>
            <Link
              href={`/${countryCode}/dashboard`}
              className="px-6 py-3.5 bg-blue-800 text-white font-bold text-sm rounded-xl hover:bg-blue-900 border border-blue-500 transition-colors"
            >
              Access Customer Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
