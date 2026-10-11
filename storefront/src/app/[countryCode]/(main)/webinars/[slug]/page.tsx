import React from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  Calendar,
  Clock,
  Award,
  Video,
  FileText,
  Download,
  Users,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  BookOpen,
} from "lucide-react"
import { getWebinarBySlug, getWebinars } from "@lib/data/webinars"
import WebinarPurchaseOptions from "@/components/webinars/WebinarPurchaseOptions"
import WebinarCard from "@/components/webinars/WebinarCard"

export default async function WebinarDetailsPage(props: {
  params: Promise<{ countryCode: string; slug: string }>
}) {
  const { countryCode, slug } = await props.params
  const webinar = await getWebinarBySlug(slug)

  if (!webinar) {
    notFound()
  }

  const { webinars: allWebinars } = await getWebinars({ limit: 4 })
  const relatedWebinars = allWebinars.filter((w) => w.id !== webinar.id).slice(0, 3)

  const eventDate = new Date(webinar.event_date)
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Header */}
      <section className="bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <Link href={`/${countryCode}`} className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/${countryCode}/webinars`} className="hover:text-white transition-colors">Webinars</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200 truncate">{webinar.category}</span>
          </nav>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">
              {webinar.category}
            </span>
            {webinar.cpe_credits > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white">
                <Award className="w-3.5 h-3.5" />
                {webinar.cpe_credits} CPE Credits Approved
              </span>
            )}
            {webinar.is_seminar && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60">
                Masterclass Seminar
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
            {webinar.title}
          </h1>

          {/* Short Description */}
          {webinar.short_description && (
            <p className="text-slate-300 text-base max-w-3xl leading-relaxed">
              {webinar.short_description}
            </p>
          )}

          {/* Key Event Metadata Row */}
          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs sm:text-sm text-slate-300 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{webinar.start_time} - {webinar.end_time} ({webinar.timezone})</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Duration: {webinar.duration_minutes} Minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid: Description (Left) + Purchase Options (Right) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Course Details */}
          <div className="lg:col-span-7 space-y-10">
            {/* Featured Image */}
            {webinar.featured_image && (
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm aspect-video bg-slate-900">
                <img
                  src={webinar.featured_image}
                  alt={webinar.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Course Overview */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Course Overview & Program Description</h2>
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: webinar.description || "<p>Full program description available.</p>" }}
              />
            </div>

            {/* Learning Objectives */}
            {webinar.learning_objectives && webinar.learning_objectives.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Key Learning Objectives</h2>
                <ul className="space-y-3">
                  {webinar.learning_objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Audience & Prerequisites */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Target Audience & Qualifications</h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                {webinar.target_audience || "CPAs, Enrolled Agents (EAs), Tax Attorneys, Controllers, Financial Officers, and Corporate Tax Preparers."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs text-gray-600">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <strong>Program Level:</strong> Intermediate to Advanced
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <strong>Prerequisites:</strong> Basic knowledge of federal taxation & financial reporting
                </div>
              </div>
            </div>

            {/* Speaker Bio */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-gray-900">About the Instructor</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {webinar.speaker_photo && (
                  <img
                    src={webinar.speaker_photo}
                    alt={webinar.speaker_name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100 shadow-sm shrink-0"
                  />
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{webinar.speaker_name}</h3>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">{webinar.speaker_title || "Subject Matter Authority"}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {webinar.speaker_bio || "Nationally recognized educator with extensive hands-on experience advising clients and training practitioners."}
              </p>
            </div>

            {/* Refund & Cancellation Policy */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 flex items-start gap-4">
              <ShieldAlert className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-gray-900">Cancellation & Guarantee Policy</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {webinar.refund_policy || "Full refunds are granted up to 24 hours prior to the live session broadcast. On-demand recordings provide 1 year of continuous access."}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Purchase Box */}
          <div className="lg:col-span-5 sticky top-24">
            <WebinarPurchaseOptions webinar={webinar} countryCode={countryCode} />
          </div>
        </div>
      </section>

      {/* Related Webinars Section */}
      {relatedWebinars.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Courses & Masterclasses</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedWebinars.map((item) => (
              <WebinarCard key={item.id} webinar={item} countryCode={countryCode} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
