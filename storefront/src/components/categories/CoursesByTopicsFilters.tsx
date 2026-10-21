"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Search,
  X,
  Filter,
  Layers,
  Calendar,
  PlayCircle,
  BookOpen,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react"
import { OfficialCategory } from "@lib/data/categories"

interface CoursesByTopicsFiltersProps {
  categories: OfficialCategory[]
  selectedCategorySlug?: string
  initialSearch?: string
  initialType?: string
  initialSort?: string
  basePath: string
}

const COURSE_TYPES = [
  { id: "all", label: "All Formats", icon: Layers },
  { id: "upcoming", label: "Upcoming Live", icon: Calendar },
  { id: "prerecorded", label: "Pre-Recorded", icon: PlayCircle },
  { id: "self-study", label: "Self-Study", icon: BookOpen },
]

const SORT_OPTIONS = [
  { id: "upcoming", label: "Sort: Scheduled Date (Upcoming First)" },
  { id: "newest", label: "Sort: Recently Added" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "cpe", label: "CPE Credits: High to Low" },
]

export default function CoursesByTopicsFilters({
  categories,
  selectedCategorySlug,
  initialSearch = "",
  initialType = "all",
  initialSort = "upcoming",
  basePath,
}: CoursesByTopicsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(initialSearch)

  const activeCategory = searchParams.get("category") || selectedCategorySlug || "all"
  const activeType = searchParams.get("type") || initialType || "all"
  const activeSort = searchParams.get("sort") || initialSort || "upcoming"

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newParams).forEach(([key, val]) => {
      if (!val || val === "all") {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })

    const queryString = params.toString()
    router.push(queryString ? `${basePath}?${queryString}` : basePath, { scroll: false })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchTerm.trim() || null })
  }

  const handleClearAll = () => {
    setSearchTerm("")
    router.push(basePath, { scroll: false })
  }

  const hasActiveFilters = Boolean(
    searchTerm ||
    (activeCategory && activeCategory !== "all" && !selectedCategorySlug) ||
    (activeType && activeType !== "all") ||
    (activeSort && activeSort !== "upcoming")
  )

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm space-y-5 transition-colors">
      {/* Top Search & Sort Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search courses by topic, speaker name, IRS form, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("")
                updateFilters({ search: null })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="appearance-none text-xs font-semibold py-2.5 pl-8 pr-8 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Reset all search filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (rendered only when on the main Courses by Topics catalog) */}
      {!selectedCategorySlug && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Filter by Topic Discipline
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateFilters({ category: null })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              All Topics
            </button>

            {categories.map((cat) => {
              const isSelected =
                activeCategory.toLowerCase() === cat.slug.toLowerCase() ||
                activeCategory.toLowerCase() === cat.name.toLowerCase()

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => updateFilters({ category: cat.slug })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{cat.name}</span>
                  {typeof cat.webinars_count === "number" && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-blue-700 text-blue-100"
                          : "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                      }`}
                    >
                      {cat.webinars_count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Format / Type Pills */}
      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mr-1">
          Course Type:
        </span>
        {COURSE_TYPES.map((t) => {
          const Icon = t.icon
          const isSelected = activeType === t.id

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => updateFilters({ type: t.id })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm"
                  : "bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200/80 dark:border-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
