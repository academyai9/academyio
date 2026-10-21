"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  X,
  ChevronDown,
  HelpCircle,
  FileQuestion,
  Layers,
  Award,
  CreditCard,
  Wrench,
  Package,
  BookOpen,
} from "lucide-react"
import { FaqItem } from "@lib/data/faqs"

interface FaqAccordionProps {
  items: FaqItem[]
  countryCode: string
  supportEmail: string
}

const CATEGORIES = [
  "All",
  "Webinar Formats",
  "Registration & Access",
  "CPE & Credits",
  "Materials & Delivery",
  "Payments & Refunds",
  "Technical & Support",
] as const

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "Webinar Formats":
      return <Layers className="w-3.5 h-3.5 text-blue-500" />
    case "Registration & Access":
      return <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
    case "CPE & Credits":
      return <Award className="w-3.5 h-3.5 text-purple-500" />
    case "Materials & Delivery":
      return <Package className="w-3.5 h-3.5 text-amber-500" />
    case "Payments & Refunds":
      return <CreditCard className="w-3.5 h-3.5 text-pink-500" />
    case "Technical & Support":
      return <Wrench className="w-3.5 h-3.5 text-cyan-500" />
    default:
      return <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
  }
}

export default function FaqAccordion({
  items,
  countryCode,
  supportEmail,
}: FaqAccordionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  // By default, open the first 3 FAQs so users see answers immediately
  const [openIds, setOpenIds] = useState<Set<string>>(
    new Set(["faq-1", "faq-2", "faq-6", "faq-10"])
  )

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (openIds.size === filteredItems.length) {
      setOpenIds(new Set())
    } else {
      setOpenIds(new Set(filteredItems.map((i) => i.id)))
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory

      const matchesSearch =
        searchQuery.trim() === "" ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.paragraphs.some((p) =>
          p.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        (item.list &&
          item.list.items.some((li) =>
            li.toLowerCase().includes(searchQuery.toLowerCase())
          ))

      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, searchQuery])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length }
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1
    })
    return counts
  }, [items])

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search questions (e.g. CPE credits, refund, joining link, recording...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950 text-xs sm:text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={toggleAll}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center gap-1.5"
          >
            {openIds.size === filteredItems.length && filteredItems.length > 0
              ? "Collapse All"
              : "Expand All"}
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat
            const count = categoryCounts[cat] || 0
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-gray-50 dark:bg-slate-800/60 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? "bg-blue-700 text-white"
                      : "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* FAQs List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
            No matching questions found
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            We couldn't find any questions matching "{searchQuery}". Try a different keyword or reset filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery("")
              setSelectedCategory("All")
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isOpen = openIds.has(item.id)

            return (
              <div
                key={item.id}
                id={item.id}
                className={`rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 overflow-hidden ${
                  isOpen
                    ? "border-blue-300 dark:border-blue-900/60 shadow-sm"
                    : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700"
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-5 py-4 sm:px-6 sm:py-5 flex items-start justify-between gap-4 text-left group"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                      {item.number}
                    </span>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-[10px] font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
                        <CategoryIcon category={item.category} />
                        <span>{item.category}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.question}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`w-7 h-7 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center shrink-0 transition-transform duration-200 mt-1 ${
                      isOpen ? "rotate-180 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" : "text-gray-400"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 border-t border-gray-100 dark:border-slate-800/80 mt-2 space-y-3 text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                    {/* Paragraphs */}
                    {item.paragraphs.map((p, idx) => {
                      const hasRefundLink = p.includes("Refund Policy")
                      const hasEmail = p.includes(supportEmail)

                      return (
                        <p key={idx} className="leading-relaxed">
                          {hasRefundLink ? (
                            <>
                              {p.split("Refund Policy")[0]}
                              <Link
                                href={`/${countryCode}/refund-policy`}
                                className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                Refund Policy
                              </Link>
                              {p.split("Refund Policy")[1]}
                            </>
                          ) : hasEmail ? (
                            <>
                              {p.split(supportEmail)[0]}
                              <a
                                href={`mailto:${supportEmail}`}
                                className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
                              >
                                {supportEmail}
                              </a>
                              {p.split(supportEmail)[1]}
                            </>
                          ) : (
                            p
                          )}
                        </p>
                      )
                    })}

                    {/* Bullet List */}
                    {item.list && (
                      <div className="space-y-1.5 pt-1 pl-1">
                        {item.list.intro && (
                          <p className="font-semibold text-gray-800 dark:text-slate-200">
                            {item.list.intro}
                          </p>
                        )}
                        <ul className="space-y-1.5">
                          {item.list.items.map((li, lIdx) => {
                            const hasLiEmail = li.includes(supportEmail)
                            return (
                              <li key={lIdx} className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2" />
                                <span className="leading-relaxed">
                                  {hasLiEmail ? (
                                    <>
                                      {li.split(supportEmail)[0]}
                                      <a
                                        href={`mailto:${supportEmail}`}
                                        className="text-blue-600 dark:text-blue-400 font-semibold underline"
                                      >
                                        {supportEmail}
                                      </a>
                                      {li.split(supportEmail)[1]}
                                    </>
                                  ) : (
                                    li
                                  )}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    {/* Followup note */}
                    {item.followup && (
                      <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300">
                        {item.followup.includes(supportEmail) ? (
                          <>
                            {item.followup.split(supportEmail)[0]}
                            <a
                              href={`mailto:${supportEmail}`}
                              className="font-bold underline"
                            >
                              {supportEmail}
                            </a>
                            {item.followup.split(supportEmail)[1]}
                          </>
                        ) : (
                          item.followup
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
