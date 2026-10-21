"use client"

import React, { useState, useMemo } from "react"
import { Search, X, Users, Filter, GraduationCap } from "lucide-react"
import { SpeakerItem } from "@lib/data/webinars"
import SpeakerCard from "./SpeakerCard"

interface SpeakerDirectoryProps {
  speakers: SpeakerItem[]
  countryCode?: string
}

const CREDENTIAL_FILTERS = [
  { id: "all", label: "All Faculty" },
  { id: "cpa", label: "CPA" },
  { id: "jd", label: "JD / Legal" },
  { id: "ea", label: "Enrolled Agent (EA)" },
  { id: "tax", label: "Tax Authorities" },
]

export default function SpeakerDirectory({
  speakers,
  countryCode = "us",
}: SpeakerDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")

  // Filter speakers based on search query and selected credential filter
  const filteredSpeakers = useMemo(() => {
    return speakers.filter((speaker) => {
      // 1. Check credential filter
      if (activeFilter !== "all") {
        const quals = (speaker.qualifications || "").toLowerCase()
        const desig = (speaker.designation || "").toLowerCase()
        const title = (speaker.title || "").toLowerCase()

        if (activeFilter === "cpa" && !quals.includes("cpa") && !desig.includes("cpa")) {
          return false
        }
        if (
          activeFilter === "jd" &&
          !quals.includes("jd") &&
          !quals.includes("llm") &&
          !quals.includes("esq") &&
          !desig.includes("attorney") &&
          !desig.includes("counsel")
        ) {
          return false
        }
        if (activeFilter === "ea" && !quals.includes("ea") && !desig.includes("enrolled agent")) {
          return false
        }
        if (
          activeFilter === "tax" &&
          !desig.includes("tax") &&
          !title.includes("tax") &&
          !quals.includes("tax")
        ) {
          return false
        }
      }

      // 2. Check search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchName = speaker.name?.toLowerCase().includes(query)
        const matchDesignation = speaker.designation?.toLowerCase().includes(query)
        const matchTitle = speaker.title?.toLowerCase().includes(query)
        const matchCompany = speaker.company?.toLowerCase().includes(query)
        const matchQuals = speaker.qualifications?.toLowerCase().includes(query)
        const matchBio = speaker.bio?.toLowerCase().includes(query)

        if (!matchName && !matchDesignation && !matchTitle && !matchCompany && !matchQuals && !matchBio) {
          return false
        }
      }

      return true
    })
  }, [speakers, activeFilter, searchQuery])

  return (
    <div className="space-y-8">
      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search faculty by name, title, credential, or firm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Clear Filters (if active) */}
          {(searchQuery || activeFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("")
                setActiveFilter("all")
              }}
              className="w-full sm:w-auto text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            Specialization:
          </span>
          {CREDENTIAL_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                }`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Directory Status / Title */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pb-2 border-b border-gray-100 dark:border-slate-800">
        <span className="font-semibold text-gray-700 dark:text-slate-300">
          Distinguished Faculty & Keynote Instructors
        </span>
      </div>

      {/* Grid or Empty State */}
      {filteredSpeakers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-slate-100">
            No faculty members found
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
            Try adjusting your search keywords or switching your filter back to "All Faculty".
          </p>
          <button
            onClick={() => {
              setSearchQuery("")
              setActiveFilter("all")
            }}
            className="mt-2 inline-flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpeakers.map((speaker) => (
            <SpeakerCard key={speaker.id} speaker={speaker} countryCode={countryCode} />
          ))}
        </div>
      )}
    </div>
  )
}
