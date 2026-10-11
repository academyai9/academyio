"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Filter, X, Calendar, Video, BookOpen, Layers } from "lucide-react"

const CATEGORIES = [
  "All Categories",
  "Federal Taxation",
  "Auditing & Accounting",
  "Corporate Tax",
  "Estate & Financial Planning",
  "Emerging Technology & Audit",
]

const TYPES = [
  { id: "all", label: "All Events", icon: Layers },
  { id: "upcoming", label: "Upcoming Live", icon: Calendar },
  { id: "ondemand", label: "On-Demand", icon: Video },
  { id: "seminar", label: "Seminars", icon: BookOpen },
]

export default function WebinarFilters({ initialCategory, initialType, initialSearch }: {
  initialCategory?: string
  initialType?: string
  initialSearch?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(initialSearch || "")
  const selectedType = initialType || searchParams.get("type") || "all"
  const selectedCategory = initialCategory || searchParams.get("category") || "All Categories"

  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newParams).forEach(([key, val]) => {
      if (!val || val === "all" || val === "All Categories") {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })

    router.push(`${pathname}?${params.toString()}`)
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8 shadow-sm space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by topic, speaker name, IRS form, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto text-xs font-medium">
          {TYPES.map((t) => {
            const Icon = t.icon
            const active = selectedType === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateFilters({ type: t.id })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-all whitespace-nowrap ${
                  active
                    ? "bg-white text-blue-600 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Categories:
        </span>
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => updateFilters({ category: cat })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                active
                  ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
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
