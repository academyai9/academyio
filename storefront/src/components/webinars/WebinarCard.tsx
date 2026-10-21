import React from "react"
import Link from "next/link"
import { Calendar, Clock, Award, Video, FileText, Download, Sparkles, User, ArrowRight, BookOpen, PlayCircle } from "lucide-react"
import { WebinarItem } from "@lib/data/webinars"

interface WebinarCardProps {
  webinar: WebinarItem
  countryCode?: string
  isIncludedInSubscription?: boolean
}

export default function WebinarCard({
  webinar,
  countryCode = "us",
  isIncludedInSubscription,
}: WebinarCardProps) {
  // Format event date
  const eventDate = new Date(webinar.event_date)
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const linkHref = `/${countryCode}/webinars/${webinar.slug}`

  // Format type badge (Rename On-Demand to Self-Study)
  const getTypeBadge = () => {
    if (webinar.is_ondemand || (webinar.is_completed && webinar.has_recording)) {
      return {
        label: "Self-Study Recording",
        bg: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      }
    }
    if (webinar.is_completed || webinar.recording_coming_soon) {
      return {
        label: "Live Ended • Recording Soon",
        bg: "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      }
    }
    return {
      label: "Upcoming Live Session",
      bg: "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    }
  }

  const badge = getTypeBadge()

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 overflow-hidden">
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

        {/* Bottom Category & Subscription Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            {webinar.category}
          </span>
          {(isIncludedInSubscription || (webinar as any).is_included_in_subscription) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600/90 text-white backdrop-blur-sm flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3 h-3 text-emerald-200" />
              Included in Plan
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Date, Time, Duration */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 dark:text-slate-400 mb-2.5">
            <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
              {webinar.start_time} ({webinar.duration_minutes}m)
            </span>
          </div>

          {/* Title */}
          <Link href={linkHref}>
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
              {webinar.title}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="text-gray-600 dark:text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
            {webinar.short_description || "Comprehensive professional training covering current regulations, calculations, and compliance strategies."}
          </p>
        </div>

        {/* Speaker Profile & Purchase Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
          {/* Speaker */}
          {webinar.speaker_id ? (
            <Link
              href={`/${countryCode}/speakers/${webinar.speaker_id}`}
              className="flex items-center gap-2.5 group/speaker hover:opacity-90 transition-opacity"
            >
              {webinar.speaker_photo ? (
                <img
                  src={webinar.speaker_photo}
                  alt={webinar.speaker_name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 group-hover/speaker:text-blue-600 dark:group-hover/speaker:text-blue-400 truncate transition-colors">
                  {webinar.speaker_name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                  {webinar.speaker_title || "Instructor & Subject Matter Expert"}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              {webinar.speaker_photo ? (
                <img
                  src={webinar.speaker_photo}
                  alt={webinar.speaker_name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-slate-400">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 truncate">{webinar.speaker_name}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{webinar.speaker_title || "Instructor & Subject Matter Expert"}</p>
              </div>
            </div>
          )}

          {/* Available Formats Icons */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-50 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
              {Boolean(webinar.has_live && !webinar.is_completed) && (
                <span title="Live Session" className="p-1 rounded bg-gray-50 dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Video className="w-3.5 h-3.5" />
                </span>
              )}
              {Boolean(webinar.recording_ready || webinar.has_recording) && (
                <span title="Self-Study Recording" className="p-1 rounded bg-gray-50 dark:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </span>
              )}
              <span title="Transcript Included" className="p-1 rounded bg-gray-50 dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <span title="Downloadable PDF Guides" className="p-1 rounded bg-gray-50 dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Download className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {(() => {
                const prices = webinar.variants
                  ?.map((v) => v.price)
                  .filter((p): p is number => typeof p === "number" && p > 0)
                const minPrice = prices && prices.length > 0 ? Math.min(...prices) : 149
                return (
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    <span className="text-[10px] font-normal text-gray-500 dark:text-slate-400">From </span>
                    ${minPrice}
                  </span>
                )
              })()}
              <Link
                href={linkHref}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white transition-all group/btn"
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
