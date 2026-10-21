import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, PlayCircle, Video, Search, Sparkles, Filter } from "lucide-react"
import { getWebinars } from "@lib/data/webinars"
import PreRecordedCard from "@/components/webinars/PreRecordedCard"
import WebinarFilters from "@/components/webinars/WebinarFilters"

export const metadata = {
  title: "Pre-Recorded Webinars | AcademyIO",
  description:
    "Explore self-study pre-recorded webinars and masterclasses with instant video access and self-study resources.",
}

export default async function PreRecordedWebinarsPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ category?: string; search?: string; speaker?: string; page?: string; type?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const currentPage = parseInt(searchParams.page || "1", 10)
  const pageSize = 12

  if (searchParams.type && searchParams.type !== "prerecorded" && searchParams.type !== "pre-recorded") {
    const params = new URLSearchParams()
    if (searchParams.type !== "all") params.set("type", searchParams.type)
    if (searchParams.category) params.set("category", searchParams.category)
    if (searchParams.search) params.set("search", searchParams.search)
    const qs = params.toString()
    redirect(`/${countryCode}/webinars${qs ? `?${qs}` : ""}`)
  }

  // Fetch webinars with type="prerecorded"
  const { webinars: prerecordedList, count } = await getWebinars({
    type: "prerecorded",
    category: searchParams.category,
    search: searchParams.search,
    limit: 100,
  })

  // Ensure items strictly have recording verified, uploaded, and published by admin
  let displayWebinars = prerecordedList.filter(
    (w) => (w.recording_published !== false) && (w.recording_ready || w.has_recording)
  )

  // Sort by newest recording published / created first (newest available recording at top)
  displayWebinars.sort((a, b) => {
    const timeA = new Date((a as any).recording_expires_at || a.event_date).getTime()
    const timeB = new Date((b as any).recording_expires_at || b.event_date).getTime()
    return timeB - timeA
  })

  // Pagination slice
  const totalPages = Math.ceil(displayWebinars.length / pageSize) || 1
  const paginatedWebinars = displayWebinars.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

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
          <span className="text-gray-900 dark:text-white font-semibold">Pre-Recorded</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pt-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
              <PlayCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Verified Video Recordings
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Pre-Recorded Webinars
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Watch published, verified high-definition recordings of concluded masterclasses on your own schedule.
              Newest published recordings appear first. Enjoy full playback controls, downloadable study guides, and verbatim transcripts.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Component */}
      <WebinarFilters
        initialCategory={searchParams.category}
        initialType="prerecorded"
        initialSearch={searchParams.search}
      />

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pb-2 border-b border-gray-100 dark:border-slate-800">
        <span>
          Showing <strong className="text-gray-900 dark:text-white">{paginatedWebinars.length}</strong> of{" "}
          <strong className="text-gray-900 dark:text-white">{displayWebinars.length}</strong> available recordings (Newest First)
        </span>
      </div>

      {/* Listing Grid */}
      {paginatedWebinars.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Video className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Pre-Recorded Webinars Found</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
              Webinars only appear in this pre-recorded library once their live broadcast has concluded and their video
              recording has been verified and published by an administrator.
            </p>
          </div>
          <Link
            href={`/${countryCode}/webinars`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Browse All Courses
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedWebinars.map((webinar) => (
              <PreRecordedCard key={webinar.id} webinar={webinar} countryCode={countryCode} />
            ))}
          </div>

          {/* Pagination Controls if > 1 page */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Link
                  key={pageNum}
                  href={`/${countryCode}/webinars/pre-recorded?page=${pageNum}${searchParams.category ? `&category=${searchParams.category}` : ""}${searchParams.search ? `&search=${searchParams.search}` : ""}`}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                    currentPage === pageNum
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
                  }`}
                >
                  {pageNum}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
