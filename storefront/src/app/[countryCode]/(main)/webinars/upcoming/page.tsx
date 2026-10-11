import React from "react"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"
import WebinarFilters from "@/components/webinars/WebinarFilters"

export default async function UpcomingWebinarsPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ category?: string; search?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams

  const { webinars, count } = await getWebinars({
    type: "upcoming",
    category: searchParams.category,
    search: searchParams.search,
    limit: 50,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Live Learning</span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Upcoming Live Webinars</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
          Interactive live broadcasts featuring real-time instructor Q&A, active polling attendance verification,
          and immediate CPE credit certificate issuance.
        </p>
      </div>

      <WebinarFilters
        initialCategory={searchParams.category}
        initialType="upcoming"
        initialSearch={searchParams.search}
      />

      <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
        <span>Showing <strong className="text-gray-900">{webinars.length}</strong> upcoming sessions</span>
      </div>

      {webinars.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 p-8 space-y-3">
          <p className="text-base font-bold text-gray-800">No upcoming webinars found</p>
          <p className="text-xs text-gray-500">Check back soon or browse our on-demand recorded library.</p>
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
