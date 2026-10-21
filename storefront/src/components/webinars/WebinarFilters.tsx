"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Filter, X, Calendar, PlayCircle, BookOpen, Layers } from "lucide-react"

const CATEGORIES = [
  "All Categories",
  "Accounting",
  "Healthcare",
  "Housing",
  "Human Resources & Payroll",
  "Taxation",
  "Technology",
]

const TYPES = [
  { id: "all", label: "All Courses", icon: Layers },
  { id: "upcoming", label: "Upcoming Live", icon: Calendar },
  { id: "prerecorded", label: "Pre-Recorded", icon: PlayCircle },
  { id: "self-study", label: "Self-Study", icon: BookOpen },
]

export default function WebinarFilters({
  initialCategory,
  initialType,
  initialSearch,
}: {
  initialCategory?: string
  initialType?: string
  initialSearch?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(initialSearch || "")

  // Extract countryCode to ensure format switches navigate to the unified catalog page
  const pathParts = pathname.split("/").filter(Boolean)
  const countryCode = pathParts[0] || "us"
  const baseWebinarsPath = `/${countryCode}/webinars`

  // Prioritize active URL search parameter so tab switches reflect immediately
  const activeTypeParam = searchParams.get("type")
  const selectedType = activeTypeParam || initialType || "all"
  const selectedCategory = searchParams.get("category") || initialCategory || "All Categories"

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    // If initialType was set and URL didn't have type param yet, keep current type when filtering by other fields
    if (!("type" in newParams) && !params.has("type") && initialType && initialType !== "all") {
      params.set("type", initialType)
    }

    Object.entries(newParams).forEach(([key, val]) => {
      if (!val || val === "all" || val === "All Categories") {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })

    const qs = params.toString()
    // Direct navigation to the unified webinars route
    router.push(qs ? `${baseWebinarsPath}?${qs}` : baseWebinarsPath)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchTerm.trim() || null })
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    updateFilters({ search: null })
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 mb-8 shadow-sm space-y-4 transition-colors">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search by topic, speaker name, IRS form, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto text-xs font-medium">
          {TYPES.map((t) => {
            const Icon = t.icon
            const active = selectedType === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateFilters({ type: t.id })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                  active
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold"
                    : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Categories Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 text-xs border-t border-gray-100 dark:border-slate-800/60 no-scrollbar">
        <span className="text-gray-500 dark:text-slate-400 font-semibold shrink-0 flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3" />
          Topics:
        </span>
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => updateFilters({ category: cat })}
              className={`px-3 py-1.5 rounded-full transition-all shrink-0 font-medium ${
                active
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>
    </div>
  )
}
