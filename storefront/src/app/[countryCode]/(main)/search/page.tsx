import React from "react"
import { Search } from "lucide-react"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"
import WebinarFilters from "@/components/webinars/WebinarFilters"

export default async function SearchResultsPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ q?: string; search?: string; category?: string; type?: "upcoming" | "ondemand" | "all" }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const query = searchParams.q || searchParams.search || ""

  const { webinars, count } = await getWebinars({
    search: query,
    category: searchParams.category,
    type: searchParams.type,
    limit: 50,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Search Catalog</span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">
          {query ? `Search Results for "${query}"` : "Search All Webinars & Courses"}
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Discover programs by IRS form number, tax code section, speaker name, or topic.
        </p>
      </div>

      <WebinarFilters
        initialCategory={searchParams.category}
        initialType={searchParams.type}
        initialSearch={query}
      />

      <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
        <span>Found <strong className="text-gray-900">{webinars.length}</strong> matching courses</span>
      </div>

      {webinars.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 p-8 space-y-3">
          <Search className="w-10 h-10 text-gray-400 mx-auto" />
          <p className="text-base font-bold text-gray-800">No matching webinars found</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Try searching for terms like "Form 7203", "GAAP", "Tax", or "Partnership".
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
