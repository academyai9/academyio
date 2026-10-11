import React from "react"
import Link from "next/link"
import { Calendar, Clock, Award, Video, FileText, Download, Sparkles, User, ArrowRight } from "lucide-react"
import { WebinarItem } from "@lib/data/webinars"

interface WebinarCardProps {
  webinar: WebinarItem
  countryCode?: string
}

export default function WebinarCard({ webinar, countryCode = "us" }: WebinarCardProps) {
  // Format event date
  const eventDate = new Date(webinar.event_date)
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const linkHref = `/${countryCode}/webinars/${webinar.slug}`

  // Format type badge
  const getTypeBadge = () => {
    if (webinar.is_seminar) {
      return { label: "Seminar Masterclass", bg: "bg-purple-100 text-purple-800 border-purple-200" }
    }
    if (webinar.is_ondemand) {
      return { label: "On-Demand Recording", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" }
    }
    return { label: "Upcoming Live Session", bg: "bg-blue-100 text-blue-800 border-blue-200" }
  }

  const badge = getTypeBadge()

  return (
    <div className="group flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 overflow-hidden">
      {/* Featured Image & Overlays */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-900">
        {webinar.featured_image ? (
          <img
            src={webinar.featured_image}
            alt={webinar.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <Award className="w-12 h-12 text-blue-300/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md ${badge.bg}`}>
            {badge.label}
          </span>
          {webinar.cpe_credits > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-sm">
              <Award className="w-3.5 h-3.5" />
              {webinar.cpe_credits} CPE
            </span>
          )}
        </div>

        {/* Bottom Category Overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            {webinar.category}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Date, Time, Duration */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 mb-2.5">
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {webinar.start_time} ({webinar.duration_minutes}m)
            </span>
          </div>

          {/* Title */}
          <Link href={linkHref}>
            <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
              {webinar.title}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="text-gray-600 text-xs line-clamp-2 mb-4 leading-relaxed">
            {webinar.short_description || "Comprehensive professional training covering current regulations, calculations, and compliance strategies."}
          </p>
        </div>

        {/* Speaker Profile & Purchase Footer */}
        <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
          {/* Speaker */}
          <div className="flex items-center gap-2.5">
            {webinar.speaker_photo ? (
              <img
                src={webinar.speaker_photo}
                alt={webinar.speaker_name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="text-left overflow-hidden">
              <p className="text-xs font-semibold text-gray-800 truncate">{webinar.speaker_name}</p>
              <p className="text-[11px] text-gray-500 truncate">{webinar.speaker_title || "Instructor & Subject Matter Expert"}</p>
            </div>
          </div>

          {/* Available Formats Icons */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2 text-gray-400">
              <span title="Live Session" className="p-1 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Video className="w-3.5 h-3.5" />
              </span>
              <span title="Transcript Included" className="p-1 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <span title="Downloadable PDF Guides" className="p-1 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </span>
              <span title="All-Inclusive Package" className="p-1 rounded bg-gray-50 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            </div>

            <Link
              href={linkHref}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 group/btn"
            >
              View Options
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
