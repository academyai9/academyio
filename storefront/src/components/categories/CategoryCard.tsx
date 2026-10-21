import React from "react"
import Link from "next/link"
import {
  Calculator,
  HeartPulse,
  Building2,
  Users,
  Landmark,
  Cpu,
  ArrowRight,
  BookOpen,
} from "lucide-react"
import { OfficialCategory } from "@lib/data/categories"

const ICON_MAP: Record<string, React.ElementType> = {
  Calculator,
  HeartPulse,
  Building2,
  Users,
  Landmark,
  Cpu,
}

interface CategoryCardProps {
  category: OfficialCategory
  countryCode?: string
}

export default function CategoryCard({ category, countryCode = "us" }: CategoryCardProps) {
  const IconComponent = ICON_MAP[category.iconName] || BookOpen
  const targetHref = `/${countryCode}/courses-by-topics/${category.slug}`

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Decorative top accent gradient bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${category.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}
      />

      <div>
        {/* Top Header: Icon & Course Count Badge */}
        <div className="flex items-center justify-between mb-5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 text-gray-800 dark:text-slate-100 group-hover:scale-110 group-hover:bg-gradient-to-br ${category.gradient} group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm`}
          >
            <IconComponent className="w-6 h-6 transition-colors" />
          </div>

          <div className="flex items-center gap-1.5">
            {typeof category.webinars_count === "number" && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                {category.webinars_count} {category.webinars_count === 1 ? "Course" : "Courses"}
              </span>
            )}
          </div>
        </div>

        {/* Category Title */}
        <Link href={targetHref} className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug">
            {category.name}
          </h3>
        </Link>

        {/* Short Description */}
        <p className="text-xs text-gray-600 dark:text-slate-400 mt-2.5 leading-relaxed line-clamp-3">
          {category.description}
        </p>
      </div>

      {/* Footer Action Button */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <Link
          href={targetHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 group-hover:translate-x-0.5 transition-all"
        >
          <span>Explore Courses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-slate-500">
          {category.badge}
        </span>
      </div>
    </div>
  )
}
