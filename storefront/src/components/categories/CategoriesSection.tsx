import React from "react"
import Link from "next/link"
import { ArrowRight, FolderTree } from "lucide-react"
import { OfficialCategory } from "@lib/data/categories"
import CategoryCard from "./CategoryCard"

interface CategoriesSectionProps {
  categories: OfficialCategory[]
  countryCode?: string
  title?: string
  subtitle?: string
  showViewAll?: boolean
}

export default function CategoriesSection({
  categories,
  countryCode = "us",
  title = "Explore Courses by Topics & Disciplines",
  subtitle = "Browse accredited courses across six core disciplines. All webinars and self-study sessions are led by prominent national practitioners.",
  showViewAll = true,
}: CategoriesSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">
            <FolderTree className="w-3.5 h-3.5" />
            <span>Curriculum Disciplines</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {showViewAll && (
          <Link
            href={`/${countryCode}/courses-by-topics`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors shrink-0"
          >
            <span>View All Topics & Filters</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* 6 Responsive Category Cards Grid */}
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
  )
}
