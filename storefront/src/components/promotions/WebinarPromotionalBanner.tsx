"use client"

import React, { useState, useEffect } from "react"
import { Copy, Check, Clock, Sparkles, Tag, ExternalLink } from "lucide-react"
import { PromotionalBanner } from "@/lib/data/promotions"

interface WebinarPromotionalBannerProps {
  banner: PromotionalBanner | null
  className?: string
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

export default function WebinarPromotionalBanner({
  banner,
  className = "",
}: WebinarPromotionalBannerProps) {
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)

  // Countdown timer logic
  useEffect(() => {
    if (!banner?.end_date || !banner.show_countdown) {
      setTimeRemaining(null)
      return
    }

    const calculateTime = () => {
      const now = new Date().getTime()
      const end = new Date(banner.end_date!).getTime()
      const diff = end - now

      if (diff <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        }
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isExpired: false,
      }
    }

    setTimeRemaining(calculateTime())
    const interval = setInterval(() => {
      setTimeRemaining(calculateTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [banner?.end_date, banner?.show_countdown])

  if (!banner || !banner.is_active) {
    return null
  }

  // If countdown expired, hide banner automatically
  if (timeRemaining?.isExpired) {
    return null
  }

  const handleCopy = async () => {
    if (!banner.coupon_code) return
    try {
      await navigator.clipboard.writeText(banner.coupon_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error("Failed to copy coupon code:", err)
    }
  }

  // Preset style mapping
  const getPresetStyles = (preset: string) => {
    switch (preset) {
      case "festive_amber":
        return {
          container:
            "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border-amber-400/40 shadow-amber-950/20",
          badge: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
          codeBtn:
            "bg-white text-amber-900 hover:bg-amber-50 active:scale-95 shadow-md",
          timerBox: "bg-black/25 text-amber-100 border-amber-300/30",
        }
      case "navy_blue":
        return {
          container:
            "bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white border-blue-500/30 shadow-blue-950/30",
          badge: "bg-blue-500/20 text-blue-200 border-blue-400/30",
          codeBtn:
            "bg-blue-600 hover:bg-blue-500 text-white active:scale-95 shadow-md",
          timerBox: "bg-white/10 text-blue-100 border-blue-300/20",
        }
      case "emerald_green":
        return {
          container:
            "bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white border-emerald-400/40 shadow-emerald-950/25",
          badge: "bg-emerald-400/20 text-emerald-200 border-emerald-300/30",
          codeBtn:
            "bg-emerald-500 hover:bg-emerald-400 text-white active:scale-95 shadow-md",
          timerBox: "bg-black/25 text-emerald-100 border-emerald-300/20",
        }
      case "sunset_orange":
        return {
          container:
            "bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 text-white border-orange-300/40 shadow-orange-950/25",
          badge: "bg-white/20 text-white border-white/30",
          codeBtn:
            "bg-white text-orange-900 hover:bg-orange-50 active:scale-95 shadow-md",
          timerBox: "bg-black/25 text-orange-100 border-orange-300/30",
        }
      case "purple_luxury":
        return {
          container:
            "bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-950 text-white border-purple-400/40 shadow-purple-950/30",
          badge: "bg-purple-500/20 text-purple-200 border-purple-300/30",
          codeBtn:
            "bg-purple-500 hover:bg-purple-400 text-white active:scale-95 shadow-md",
          timerBox: "bg-white/10 text-purple-100 border-purple-300/20",
        }
      case "dark_gold":
        return {
          container:
            "bg-gradient-to-r from-neutral-950 via-stone-900 to-zinc-950 text-amber-200 border-amber-500/40 shadow-black/40",
          badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
          codeBtn:
            "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 active:scale-95 shadow-md font-bold",
          timerBox: "bg-amber-500/10 text-amber-200 border-amber-500/30",
        }
      default:
        return {
          container:
            "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border-amber-400/40 shadow-amber-950/20",
          badge: "bg-white/20 text-white border-white/30",
          codeBtn:
            "bg-white text-amber-900 hover:bg-amber-50 active:scale-95 shadow-md",
          timerBox: "bg-black/25 text-amber-100 border-amber-300/30",
        }
    }
  }

  const presetStyle = getPresetStyles(banner.style_preset || "festive_amber")

  // Expiration date formatted (e.g. "November 30")
  const formattedEndDate = banner.end_date
    ? new Date(banner.end_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <div
      role="banner"
      aria-label={banner.title}
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-6 lg:px-8 lg:py-0 lg:h-[150px] flex items-center shadow-md transition-all duration-300 ${presetStyle.container} ${className}`}
      style={{
        backgroundColor: banner.bg_color || undefined,
        color: banner.text_color || undefined,
      }}
    >
      {/* Subtle decorative glow overlay */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Side: Seasonal Icon + Badge + Title + Message */}
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Icon */}
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner border border-white/20">
            {banner.icon || "🎉"}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold tracking-wide uppercase text-sm sm:text-base">
                {banner.title}
              </span>
              {banner.discount_text && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${presetStyle.badge}`}
                >
                  <Sparkles className="w-3 h-3" />
                  {banner.discount_text}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-inherit opacity-95 leading-relaxed max-w-2xl font-normal">
              {banner.description ||
                `Use code ${banner.coupon_code} at checkout for instant savings.`}
              {formattedEndDate && (
                <span className="ml-1 opacity-90 font-medium">
                  Offer ends {formattedEndDate}.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Countdown + Coupon Code Copy Box + Optional CTA / Terms */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto pt-2 lg:pt-0">
          {/* Countdown Timer */}
          {banner.show_countdown && timeRemaining && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${presetStyle.timerBox}`}
              title="Time left before promotion expires"
            >
              <Clock className="w-3.5 h-3.5 opacity-80" />
              <div className="flex items-center gap-1">
                {timeRemaining.days > 0 && (
                  <>
                    <span>{timeRemaining.days}d</span>
                    <span className="opacity-50">:</span>
                  </>
                )}
                <span>
                  {String(timeRemaining.hours).padStart(2, "0")}h
                </span>
                <span className="opacity-50">:</span>
                <span>
                  {String(timeRemaining.minutes).padStart(2, "0")}m
                </span>
                <span className="opacity-50">:</span>
                <span>
                  {String(timeRemaining.seconds).padStart(2, "0")}s
                </span>
              </div>
            </div>
          )}

          {/* Interactive Coupon Box with Copy Button */}
          {banner.coupon_code && (
            <div className="inline-flex items-center rounded-xl bg-black/20 p-1 border border-white/20 backdrop-blur-sm">
              <div className="px-3 py-1 flex items-center gap-1.5 font-mono font-black tracking-wider text-xs sm:text-sm text-white">
                <Tag className="w-3.5 h-3.5 opacity-80" />
                <span>{banner.coupon_code}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${presetStyle.codeBtn}`}
                aria-label={copied ? "Coupon code copied" : `Copy coupon code ${banner.coupon_code}`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{banner.cta_text || "Copy Code"}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Terms & Conditions link */}
          {banner.terms_url && (
            <a
              href={banner.terms_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100 underline transition-opacity"
            >
              <span>Terms</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
