import React from "react"
import { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, FolderTree, BookOpen, AlertCircle } from "lucide-react"
import { getOfficialCategories } from "@lib/data/categories"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"
import CategoryCard from "@/components/categories/CategoryCard"
import CoursesByTopicsFilters from "@/components/categories/CoursesByTopicsFilters"

export const metadata: Metadata = {
  title: "Courses by Topics & Curriculum Disciplines | AcademyIO",
  description:
    "Explore accredited continuing professional education courses and masterclass webinars by topic. Browse Accounting, Healthcare, Housing, HR & Payroll, Taxation, and Technology.",
  alternates: {
    canonical: "/courses-by-topics",
  },
}

interface CoursesByTopicsPageProps {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{
    category?: string
    type?: "upcoming" | "ondemand" | "prerecorded" | "self-study" | "all"
    search?: string
    sort?: "upcoming" | "newest" | "price_asc" | "price_desc" | "cpe"
  }>
}

export default async function CoursesByTopicsPage(props: CoursesByTopicsPageProps) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams

  const activeCategory = searchParams.category
  const activeType = searchParams.type === "all" ? undefined : searchParams.type
  const activeSearch = searchParams.search
  const activeSort = searchParams.sort || "upcoming"

  // Fetch official categories and webinars in parallel
  const [categories, { webinars, count }] = await Promise.all([
    getOfficialCategories(),
    getWebinars({
      category: activeCategory,
      type: activeType,
      search: activeSearch,
      limit: 100,
    }),
  ])

  // Apply sorting
  let sortedWebinars = [...webinars]
  if (activeSort === "newest") {
    sortedWebinars.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  } else if (activeSort === "upcoming") {
    // Sort upcoming events chronologically first, then completed/on-demand
    sortedWebinars.sort((a, b) => {
      if (a.is_upcoming && !b.is_upcoming) return -1
      if (!a.is_upcoming && b.is_upcoming) return 1
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    })
  } else if (activeSort === "price_asc") {
    sortedWebinars.sort((a, b) => {
      const minA = a.variants?.length ? Math.min(...a.variants.map((v) => v.price || 999)) : 149
      const minB = b.variants?.length ? Math.min(...b.variants.map((v) => v.price || 999)) : 149
      return minA - minB
    })
  } else if (activeSort === "price_desc") {
    sortedWebinars.sort((a, b) => {
      const minA = a.variants?.length ? Math.min(...a.variants.map((v) => v.price || 0)) : 149
      const minB = b.variants?.length ? Math.min(...b.variants.map((v) => v.price || 0)) : 149
      return minB - minA
    })
  } else if (activeSort === "cpe") {
    sortedWebinars.sort((a, b) => (b.cpe_credits || 0) - (a.cpe_credits || 0))
  }

  const selectedCategoryObj = activeCategory
    ? categories.find(
        (c) =>
          c.slug.toLowerCase() === activeCategory.toLowerCase() ||
          c.name.toLowerCase() === activeCategory.toLowerCase()
      )
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-800 dark:text-slate-200">Courses by Topics</span>
        {selectedCategoryObj && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-bold text-blue-600 dark:text-blue-400">{selectedCategoryObj.name}</span>
          </>
        )}
      </nav>

      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold mb-3">
          <FolderTree className="w-3.5 h-3.5" />
          <span>Curriculum Subject Areas</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Courses by Topics
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Explore professional courses and live webinars by category. Choose a discipline below to view targeted curriculum, regulatory compliance updates, and practical CPE-accredited masterclasses.
        </p>
      </div>

      {/* Six Category Navigation Cards Grid */}
      <section aria-labelledby="topics-navigation-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="topics-navigation-heading" className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            Browse by Six Core Disciplines
          </h2>
          <span className="text-xs text-gray-500">
            Click any topic to explore dedicated courses
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              countryCode={countryCode}
            />
          ))}
        </div>
      </section>

      {/* Search, Filter & Sort Controls */}
      <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {selectedCategoryObj ? `${selectedCategoryObj.name} Masterclasses` : "All Topic Masterclasses & Webinars"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Showing <strong>{sortedWebinars.length}</strong> available courses across all formats
            </p>
          </div>
        </div>

        <CoursesByTopicsFilters
          categories={categories}
          selectedCategorySlug={selectedCategoryObj?.slug}
          initialSearch={activeSearch}
          initialType={activeType}
          initialSort={activeSort}
          basePath={`/${countryCode}/courses-by-topics`}
        />

        {/* Results Course Grid */}
        {sortedWebinars.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                No courses match your current selection
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                We couldn't find any courses matching your specific search or filter criteria. Try clearing filters or exploring another topic category.
              </p>
            </div>
            <Link
              href={`/${countryCode}/courses-by-topics`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Reset All Filters & View All Topics
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedWebinars.map((webinar) => (
              <WebinarCard
                key={webinar.id}
                webinar={webinar}
                countryCode={countryCode}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
