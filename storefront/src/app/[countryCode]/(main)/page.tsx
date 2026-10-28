import React from "react"
import Link from "next/link"
import { Award, Calendar, Video, FileText, Download, Sparkles, CheckCircle, ArrowRight, ShieldCheck, Users, BookOpen } from "lucide-react"
import { getWebinars, getStoreSpeakers, SpeakerItem } from "@lib/data/webinars"
import { getOfficialCategories } from "@lib/data/categories"
import { getTestimonials } from "@lib/data/testimonials"
import { getAccreditationOrganizations } from "@lib/data/organizations"
import { getStoreOtherInfo } from "@lib/data/other-info"
import WebinarCard from "@/components/webinars/WebinarCard"
import CategoriesSection from "@/components/categories/CategoriesSection"
import ClientTestimonials from "@/components/testimonials/ClientTestimonials"
import AccreditationTrustBar from "@/components/accreditation/AccreditationTrustBar"
import OtherInfoSection from "@/components/info/OtherInfoSection"
import HomepageNewsletterSection from "@/components/newsletter/HomepageNewsletterSection"

export default async function HomePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [
    webinarsData,
    categories,
    testimonials,
    orgsData,
    otherInfoData,
    allSpeakers,
  ] = await Promise.all([
    getWebinars({ limit: 6 }).catch(() => ({ webinars: [], count: 0 })),
    getOfficialCategories().catch(() => []),
    getTestimonials({ homepage_only: true }).catch(() => []),
    getAccreditationOrganizations().catch(() => ({ global_enabled: true, organizations: [] })),
    getStoreOtherInfo().catch(() => ({ global_enabled: true, items: [] })),
    getStoreSpeakers({ featured: true }).catch(() => []),
  ])

  const webinars = Array.isArray(webinarsData?.webinars) ? webinarsData.webinars : []
  const upcomingWebinars = webinars.filter((w) => w?.is_upcoming).slice(0, 3)
  const selfStudyWebinars = webinars.filter((w) => w && (w.is_ondemand || w.recording_ready || w.has_recording || w.is_completed)).slice(0, 3)

  // Featured faculty configured in admin dashboard
  const validFeatured = (allSpeakers || []).filter(
    (s: SpeakerItem) => s.is_featured !== false && s.status !== "archived"
  )
  const featuredFaculty = (validFeatured.length > 0 ? validFeatured : allSpeakers || [])
    .sort((a: SpeakerItem, b: SpeakerItem) => (a.featured_order || 0) - (b.featured_order || 0))
    .slice(0, 5)

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
            Advance Your Expertise With Masterclass Webinars & Professional Training
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Targeted instruction on IRS Form compliance, GAAP accounting updates, and corporate tax strategies.
            Select your preferred purchase option: live session, self-study video recording, verbatim transcript, or study PDFs.
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
              href={`/${countryCode}/webinars/self-study`}
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              Browse Self-Study Catalog
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-800/80 text-left">
            <div>
              <span className="text-2xl font-black text-white block">100%</span>
              <span className="text-xs text-slate-400">Practical Case Studies</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white block">4 Options</span>
              <span className="text-xs text-slate-400">Live, Recorded, Transcript & Digital Access</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white block">1 - 2 CPE</span>
              <span className="text-xs text-slate-400">Credits Per Masterclass</span>
            </div>
            <div>
              <span className="text-2xl font-black text-white block">Instant</span>
              <span className="text-xs text-slate-400">Dashboard Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories & Topics Section */}
      <CategoriesSection categories={categories} countryCode={countryCode} />

      {/* Featured Webinars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Top Recommended</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100 mt-1">Featured Upcoming Webinars</h2>
          </div>
          <Link
            href={`/${countryCode}/webinars`}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
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
      <section className="bg-slate-100 dark:bg-slate-900/60 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Flexible Commerce</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100 mt-1">
              Purchase Only The Formats You Need
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
              Every webinar supports tailored access options so you never pay for materials you don't use.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                title: "Live Webinar",
                icon: Video,
                color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
                desc: "Join real-time broadcast, interact with instructors during live Q&A, and verify CPE attendance.",
              },
              {
                title: "Self-Study Recording",
                icon: Video,
                color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
                desc: "High-definition streaming accessible 24/7 from your customer dashboard with 1 year access.",
              },
              {
                title: "Webinar Transcript",
                icon: FileText,
                color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
                desc: "Verbatim written transcription of instructor presentations and participant questions.",
              },
              {
                title: "PDF Study Guide",
                icon: Download,
                color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
                desc: "Instructor slide decks, IRS calculation worksheets, and practice compliance checklists.",
              },
              {
                title: "Complete Package",
                badge: "Best Value",
                icon: Sparkles,
                color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
                desc: "All-inclusive pass granting instant access to Live broadcast, Recording, Transcript, and all PDFs.",
              },
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-lg border ${f.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {f.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm">{f.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Professional Organizations & Accreditation Logos */}
      <AccreditationTrustBar
        organizations={orgsData.organizations}
        globalEnabled={orgsData.global_enabled}
        settings={orgsData.settings}
      />

      {/* Self-Study Learning Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Self-Paced Learning</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100 mt-1">Available for Self-Study Right Now</h2>
          </div>
          <Link
            href={`/${countryCode}/webinars/self-study`}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1"
          >
            Browse All Self-Study Courses
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selfStudyWebinars.map((webinar) => (
            <WebinarCard key={webinar.id} webinar={webinar} countryCode={countryCode} />
          ))}
        </div>
      </section>

      {/* Leading Faculty Showcase */}
      <section className="bg-white dark:bg-slate-900/50 py-16 border-y border-gray-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Faculty & Instructors</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100 mt-1">
              Learn Directly From Nationally Recognized Practitioners
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
              Our speakers are prominent tax attorneys, authors, former Big 4 audit managers, and accounting professors.
            </p>
            <div className="mt-4">
              <Link
                href={`/${countryCode}/speakers`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                <span>Browse Complete Faculty & Speakers Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
            {featuredFaculty.map((spk) => (
              <Link
                key={spk.id}
                href={`/${countryCode}/speakers/${spk.slug || spk.id}`}
                className="group relative bg-gray-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700/60 hover:border-blue-400/60 dark:hover:border-blue-600/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center text-center"
              >
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-3.5">
                  <img
                    src={spk.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"}
                    alt={spk.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md group-hover:scale-105 transition-transform duration-300"
                  />
                  {spk.qualifications && (
                    <span className="absolute bottom-0 right-1 px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm border border-white dark:border-slate-800">
                      {spk.qualifications.split(",")[0].trim()}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm sm:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {spk.name}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {spk.designation || spk.title || "Accredited Faculty"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Continuing Education Standards & Other Information */}
      <OtherInfoSection
        items={otherInfoData.items}
        globalEnabled={otherInfoData.global_enabled}
        settings={otherInfoData.settings}
      />

      {/* Client Testimonials Section */}
      <ClientTestimonials testimonials={testimonials} />

      {/* Newsletter Subscription Section */}
      <HomepageNewsletterSection countryCode={countryCode} />

      {/* Ready to Enroll Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold max-w-2xl mx-auto">
            Ready to Earn Your CPE Credits & Master Practical Tax Solutions?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
            Join thousands of accounting and tax professionals enrolled across our live broadcasts and self-study programs.
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
