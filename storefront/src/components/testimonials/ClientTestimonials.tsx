"use client"

import React, { useState } from "react"
import { Star, Quote, ChevronLeft, ChevronRight, CheckCircle2, Award } from "lucide-react"
import { TestimonialItem } from "@lib/data/testimonials"

export default function ClientTestimonials({
  testimonials = [],
}: {
  testimonials: TestimonialItem[]
}) {
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 3

  if (!testimonials || testimonials.length === 0) return null

  const totalPages = Math.ceil(testimonials.length / itemsPerPage)
  const displayed = testimonials.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )

  const handlePrev = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1))
  }

  const handleNext = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0))
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
            <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Verified Attendee Experiences</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-2">
            What Practitioners & Financial Leaders Say
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real feedback from CPAs, Enrolled Agents, Corporate Controllers, and HR Executives who advance their credentials with AcademyIO.
          </p>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Previous testimonials"
              className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 px-1">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={handleNext}
              aria-label="Next testimonials"
              className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Testimonial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayed.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 group"
          >
            <div className="space-y-4">
              {/* Star Rating & Verified Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: item.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Review</span>
                </div>
              </div>

              {/* Quote Content */}
              <div className="relative">
                <Quote className="w-8 h-8 text-blue-100 dark:text-blue-950/80 absolute -top-2 -left-2 -z-0 opacity-60" />
                <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed relative z-10 italic">
                  "{item.content}"
                </p>
              </div>
            </div>

            {/* Author Footer */}
            <div className="pt-5 mt-5 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3.5">
              {item.avatar_url ? (
                <img
                  src={item.avatar_url}
                  alt={item.customer_name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                  {item.customer_name.charAt(0)}
                </div>
              )}

              <div className="min-w-0">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {item.customer_name}
                </h4>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                  {item.designation}
                </p>
                {item.company && (
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                    {item.company}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
