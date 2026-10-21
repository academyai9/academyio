"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  Award,
  PlayCircle,
  User,
  ShoppingBag,
  ArrowRight,
  CheckCircle,
} from "lucide-react"
import { WebinarItem } from "@lib/data/webinars"
import { addToCart } from "@lib/data/cart"

interface PreRecordedCardProps {
  webinar: WebinarItem
  countryCode?: string
}

export default function PreRecordedCard({
  webinar,
  countryCode = "us",
}: PreRecordedCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)

  // Format original live date
  const eventDate = new Date(webinar.event_date)
  const formattedDate = !isNaN(eventDate.getTime())
    ? eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recent Broadcast"

  const linkHref = `/${countryCode}/webinars/${webinar.slug}`

  // Find recording variant and price
  const recordingVariant =
    webinar.variants?.find(
      (v) => v.option_type === "recording" || v.includes?.recording
    ) || webinar.variants?.[0]

  const recordingPrice =
    recordingVariant?.price !== undefined
      ? recordingVariant.price
      : 149
  const currency = recordingVariant?.currency_code
    ? recordingVariant.currency_code.toUpperCase()
    : "USD"

  const handleBuyRecording = async () => {
    if (!recordingVariant?.id || recordingVariant.id.startsWith("default_")) {
      router.push(linkHref)
      return
    }

    setLoading(true)
    try {
      await addToCart({
        variantId: recordingVariant.id,
        quantity: 1,
        countryCode,
      })
      setAdded(true)
      setTimeout(() => {
        router.push(`/${countryCode}/checkout`)
      }, 400)
    } catch (err) {
      console.error("Failed to add recording to cart:", err)
      router.push(linkHref)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-900">
        {webinar.featured_image ? (
          <img
            src={webinar.featured_image}
            alt={webinar.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
            <PlayCircle className="w-12 h-12 text-indigo-400/50" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* Top Badges: Strictly Pre-Recorded & CPE (No live / upcoming badges) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md bg-indigo-950/80 text-indigo-200 border-indigo-700/60 flex items-center gap-1.5">
            <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
            Pre-Recorded Course
          </span>
          {webinar.cpe_credits > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white shadow-sm">
              <Award className="w-3.5 h-3.5" />
              {webinar.cpe_credits} CPE
            </span>
          )}
        </div>

        {/* Category tag */}
        <div className="absolute bottom-3 left-3">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            {webinar.category}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Original Live Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mb-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Original Broadcast: <strong className="text-gray-700 dark:text-slate-200 font-semibold">{formattedDate}</strong>
            </span>
            <span className="text-gray-300 dark:text-slate-700">•</span>
            <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400 dark:text-slate-500" />
              {webinar.duration_minutes || 60}m
            </span>
          </div>

          {/* Title */}
          <Link href={linkHref}>
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
              {webinar.title}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="text-gray-600 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
            {webinar.short_description ||
              "Full self-study video recording including high-definition playback, instructor slide deck, and reference materials."}
          </p>
        </div>

        {/* Speaker Info */}
        <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
          {webinar.speaker_id ? (
            <Link
              href={`/${countryCode}/speakers/${webinar.speaker_id}`}
              className="flex items-center gap-2.5 group/speaker hover:opacity-90 transition-opacity"
            >
              {webinar.speaker_photo ? (
                <img
                  src={webinar.speaker_photo}
                  alt={webinar.speaker_name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-gray-800 dark:text-slate-200 group-hover/speaker:text-indigo-600 dark:group-hover/speaker:text-indigo-400 transition-colors truncate">
                  {webinar.speaker_name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                  {webinar.speaker_title || (webinar.speaker as any)?.designation || "Instructor & Subject Expert"}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              {webinar.speaker_photo ? (
                <img
                  src={webinar.speaker_photo}
                  alt={webinar.speaker_name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">{webinar.speaker_name}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                  {webinar.speaker_title || (webinar.speaker as any)?.designation || "Instructor & Subject Expert"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pricing & Action Buttons */}
        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
          {/* Price Row */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                Recording Price
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">${recordingPrice}</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">{currency}</span>
              </div>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800">
              Instant HD Playback
            </div>
          </div>

          {/* Button Group */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={linkHref}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
            </Link>

            <button
              type="button"
              onClick={handleBuyRecording}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {added ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                  <span>Added!</span>
                </>
              ) : loading ? (
                <span>Adding...</span>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Buy Recording</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
