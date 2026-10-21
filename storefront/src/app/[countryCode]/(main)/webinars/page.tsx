import React from "react"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"
import WebinarFilters from "@/components/webinars/WebinarFilters"

export default async function AllWebinarsPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ category?: string; type?: "upcoming" | "ondemand" | "prerecorded" | "self-study" | "all"; search?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams

  const activeType = searchParams.type === "all" ? undefined : searchParams.type

  const { webinars, count } = await getWebinars({
    category: searchParams.category,
    type: activeType,
    search: searchParams.search,
    limit: 50,
  })

  // Dynamic header based on active tab selection
  const getHeaderDetails = () => {
    switch (activeType) {
      case "upcoming":
        return {
          badge: "Live Interactive Broadcasts",
          title: "Upcoming Live Webinars",
          desc: "Browse accredited upcoming live webinars featuring real-time speaker Q&A, active polling attendance verification, and immediate CPE credits.",
        }
      case "prerecorded":
        return {
          badge: "Published Video Library",
          title: "Pre-Recorded Webinars",
          desc: "Watch verified high-definition recordings of concluded masterclasses at your convenience. Full playback controls, downloadable study guides, and verbatim transcripts included.",
        }
      case "self-study":
      case "ondemand":
        return {
          badge: "Self-Paced Learning",
          title: "Self-Study Courses & Resources",
          desc: "Learn anytime at your own speed with full HD video recordings, searchable verbatim transcripts, and comprehensive instructor slide decks with practice worksheets.",
        }
      default:
        return {
          badge: "Catalog & Continuing Education",
          title: "All Professional Webinars",
          desc: "Explore our complete curriculum of live broadcasts and self-study sessions taught by industry-leading tax and accounting authorities.",
        }
    }
  }

  const header = getHeaderDetails()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{header.badge}</span>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 mt-1">{header.title}</h1>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
          {header.desc}
        </p>
      </div>

      {/* Filter Component */}
      <WebinarFilters
        initialCategory={searchParams.category}
        initialType={activeType || "all"}
        initialSearch={searchParams.search}
      />

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pb-2 border-b border-gray-100 dark:border-slate-800">
        <span>Showing <strong className="text-gray-900 dark:text-slate-100">{webinars.length}</strong> of <strong className="text-gray-900 dark:text-slate-100">{count}</strong> courses</span>
      </div>

      {/* Grid or Empty State */}
      {webinars.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 space-y-3">
          <p className="text-base font-bold text-gray-800 dark:text-slate-200">
            {activeType === "upcoming"
              ? "No upcoming live webinars found"
              : activeType === "prerecorded"
              ? "No pre-recorded webinars found"
              : activeType === "self-study"
              ? "No self-study courses found"
              : "No webinars found matching your criteria"}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
            Try adjusting your topic selection or clear your search query to see all available programs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {webinars.map((webinar) => (
            <WebinarCard key={webinar.id} webinar={webinar} countryCode={countryCode} />
          ))}
        </div>
      )}
    </div>
  )
}
