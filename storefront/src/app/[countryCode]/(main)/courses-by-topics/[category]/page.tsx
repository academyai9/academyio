import React from "react"
import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ChevronRight,
  Calculator,
  HeartPulse,
  Building2,
  Users,
  Landmark,
  Cpu,
  BookOpen,
  Calendar,
  Video,
  Award,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import {
  getOfficialCategories,
  getOfficialCategoryBySlug,
  OFFICIAL_CATEGORIES,
} from "@lib/data/categories"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"
import CategoryCard from "@/components/categories/CategoryCard"
import CoursesByTopicsFilters from "@/components/categories/CoursesByTopicsFilters"

const ICON_MAP: Record<string, React.ElementType> = {
  Calculator,
  HeartPulse,
  Building2,
  Users,
  Landmark,
  Cpu,
}

interface CategoryPageProps {
  params: Promise<{ countryCode: string; category: string }>
  searchParams: Promise<{
    type?: "upcoming" | "ondemand" | "prerecorded" | "self-study" | "all"
    search?: string
    sort?: "upcoming" | "newest" | "price_asc" | "price_desc" | "cpe"
  }>
}

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await props.params
  const category = getOfficialCategoryBySlug(categorySlug)

  if (!category) {
    return {
      title: "Topic Not Found | AcademyIO",
    }
  }

  return {
    title: `${category.name} Courses & Accredited Webinars | AcademyIO`,
    description: `${category.description} Earn accredited CPE credits with expert-led masterclasses.`,
    alternates: {
      canonical: `/courses-by-topics/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} Professional Courses & Webinars`,
      description: category.description,
      images: [{ url: category.image, alt: category.name }],
    },
  }
}

export default async function CategoryDetailPage(props: CategoryPageProps) {
  const { countryCode, category: categorySlug } = await props.params
  const searchParams = await props.searchParams

  const category = getOfficialCategoryBySlug(categorySlug)
  if (!category) {
    notFound()
  }

  const activeType = searchParams.type === "all" ? undefined : searchParams.type
  const activeSearch = searchParams.search
  const activeSort = searchParams.sort || "upcoming"

  // Fetch all official categories (for related categories & counts) and filtered category webinars
  const [allCategories, { webinars }] = await Promise.all([
    getOfficialCategories(),
    getWebinars({
      category: category.name,
      type: activeType,
      search: activeSearch,
      limit: 50,
    }),
  ])

  // Split into upcoming live and self-study/recordings
  const upcomingWebinars = webinars.filter((w) => w.is_upcoming)
  const selfStudyWebinars = webinars.filter((w) => w.is_ondemand || w.has_recording || w.is_completed)

  // Apply active sorting
  let sortedWebinars = [...webinars]
  if (activeSort === "newest") {
    sortedWebinars.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
  } else if (activeSort === "upcoming") {
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

  // Related categories (the other 5 categories)
  const relatedCategories = allCategories.filter((c) => c.slug !== category.slug)

  const IconComponent = ICON_MAP[category.iconName] || BookOpen

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <Link href={`/${countryCode}/courses-by-topics`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Courses by Topics
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-bold text-blue-600 dark:text-blue-400">{category.name}</span>
      </nav>

      {/* Category Hero / Introduction Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 sm:p-12 overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.25),rgba(255,255,255,0))]" />

        <div className="relative max-w-4xl space-y-5">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${category.gradient} text-white shadow-lg`}>
              <IconComponent className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-300">
                Curriculum Discipline
              </span>
              <span className="mx-2 text-slate-500">•</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-700/60 text-blue-200">
                {category.badge}
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {category.name} Courses & Webinars
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl">
            {category.description}
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-slate-300 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Accredited Continuing Professional Education</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{upcomingWebinars.length} Upcoming Live Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-400" />
              <span>{selfStudyWebinars.length} Self-Study Programs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Controls */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Available {category.name} Curriculum ({sortedWebinars.length})
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Live broadcast sessions, on-demand video recordings, verbatim transcripts, and study guides.
            </p>
          </div>
        </div>

        <CoursesByTopicsFilters
          categories={allCategories}
          selectedCategorySlug={category.slug}
          initialSearch={activeSearch}
          initialType={activeType}
          initialSort={activeSort}
          basePath={`/${countryCode}/courses-by-topics/${category.slug}`}
        />

        {/* Results Course Grid */}
        {sortedWebinars.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                No {category.name} courses match this filter
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                Try resetting your search query or view all available sessions in this topic discipline.
              </p>
            </div>
            <Link
              href={`/${countryCode}/courses-by-topics/${category.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Reset Filters for {category.name}
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

      {/* Related Categories / Other Disciplines Section */}
      <section className="pt-8 border-t border-gray-100 dark:border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Curriculum Exploration
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              Explore Other Topic Disciplines
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Broaden your professional competencies across our other accredited subject areas.
            </p>
          </div>
          <Link
            href={`/${countryCode}/courses-by-topics`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <span>View All Topics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {relatedCategories.slice(0, 3).map((rel) => (
            <CategoryCard
              key={rel.id}
              category={rel}
              countryCode={countryCode}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
