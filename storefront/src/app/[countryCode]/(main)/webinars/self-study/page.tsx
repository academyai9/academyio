import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, BookOpen, Video, FileText, Download, Award, Search, Sparkles } from "lucide-react"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"
import WebinarFilters from "@/components/webinars/WebinarFilters"

export const metadata = {
  title: "Self-Study Webinars & Learning Resources | AcademyIO",
  description:
    "Accredited self-paced webinars, recorded masterclasses, verbatim transcripts, and downloadable materials for continuing professional education.",
}

export default async function SelfStudyWebinarsPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ category?: string; search?: string; type?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams

  if (searchParams.type && searchParams.type !== "self-study" && searchParams.type !== "ondemand") {
    const params = new URLSearchParams()
    if (searchParams.type !== "all") params.set("type", searchParams.type)
    if (searchParams.category) params.set("category", searchParams.category)
    if (searchParams.search) params.set("search", searchParams.search)
    const qs = params.toString()
    redirect(`/${countryCode}/webinars${qs ? `?${qs}` : ""}`)
  }

  // Fetch self-study resources
  const { webinars: selfStudyList } = await getWebinars({
    type: "self-study",
    category: searchParams.category,
    search: searchParams.search,
    limit: 50,
  })

  // Ensure items strictly have self-study options (published recordings, transcripts, or PDF resources)
  let displayWebinars = selfStudyList.filter(
    (w) =>
      w.is_ondemand ||
      w.recording_ready ||
      w.has_recording ||
      w.has_transcript ||
      w.public_resources_count > 0
  )

  // Fallback if type filtering returned empty candidate pool
  if (displayWebinars.length === 0) {
    const { webinars: allWebinars } = await getWebinars({
      category: searchParams.category,
      search: searchParams.search,
      limit: 50,
    })
    displayWebinars = allWebinars.filter(
      (w) =>
        w.is_ondemand ||
        w.recording_ready ||
        w.has_recording ||
        w.has_transcript ||
        w.public_resources_count > 0
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb & Header */}
      <div className="space-y-3">
        <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/${countryCode}/webinars`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Webinars
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 dark:text-white font-semibold">Self-Study</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              Self-Paced Professional Learning
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Self-Study Courses & Resources
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Learn anytime at your own speed with full HD video recordings, searchable verbatim transcripts,
              and comprehensive instructor slide decks with practice worksheets.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <WebinarFilters
        initialCategory={searchParams.category}
        initialType="self-study"
        initialSearch={searchParams.search}
      />

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pb-2 border-b border-gray-100 dark:border-slate-800">
        <span>
          Showing <strong className="text-gray-900 dark:text-white">{displayWebinars.length}</strong> self-study courses
        </span>
      </div>

      {/* Listing Grid */}
      {displayWebinars.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Self-Study Resources Found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
              Webinars and educational materials become available for self-study once their recordings, transcripts,
              or learning guides are published.
            </p>
          </div>
          <Link
            href={`/${countryCode}/webinars`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Browse All Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayWebinars.map((webinar) => (
            <WebinarCard key={webinar.id} webinar={webinar} countryCode={countryCode} />
          ))}
        </div>
      )}
    </div>
  )
}
