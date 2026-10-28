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
      className={`relative overflow-hidden rounded-xl border py-2.5 px-3.5 sm:px-4.5 flex items-center shadow-xs transition-all duration-300 ${presetStyle.container} ${className}`}
      style={{
        backgroundColor: banner.bg_color || undefined,
        color: banner.text_color || undefined,
      }}
    >
      {/* Subtle decorative glow overlay */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left Side: Seasonal Icon + Badge + Title + Message */}
        <div className="flex items-center gap-2.5 min-w-0">
          {banner.icon && (
            <span className="text-base sm:text-lg leading-none shrink-0" aria-hidden="true">
              {banner.icon}
            </span>
          )}

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-extrabold tracking-wide uppercase text-xs sm:text-sm whitespace-nowrap">
              {banner.title}
            </span>
            {banner.discount_text && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase px-2 py-0.5 rounded-full border shadow-2xs shrink-0 ${presetStyle.badge}`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {banner.discount_text}
              </span>
            )}
            <span className="text-[11px] sm:text-xs opacity-90 truncate hidden sm:inline">
              — Use code <strong className="font-mono font-bold text-white underline decoration-white/40">{banner.coupon_code}</strong> at checkout
              {formattedEndDate && <span className="ml-1 opacity-80">(Ends {formattedEndDate})</span>}
            </span>
          </div>
        </div>

        {/* Right Side: Countdown + Coupon Code Copy Box */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start md:self-auto">
          {/* Countdown Timer */}
          {banner.show_countdown && timeRemaining && (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${presetStyle.timerBox}`}
              title="Time left before promotion expires"
            >
              <Clock className="w-3 h-3 opacity-80 shrink-0" />
              <span>
                {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ""}
                {String(timeRemaining.hours).padStart(2, "0")}h:
                {String(timeRemaining.minutes).padStart(2, "0")}m:
                {String(timeRemaining.seconds).padStart(2, "0")}s
              </span>
            </div>
          )}

          {/* Interactive Coupon Box with Copy Button */}
          {banner.coupon_code && (
            <div className="inline-flex items-center rounded-lg bg-black/25 p-0.5 border border-white/20 backdrop-blur-sm">
              <div className="px-2 font-mono font-black tracking-wider text-xs text-white flex items-center gap-1">
                <Tag className="w-3 h-3 opacity-80" />
                <span>{banner.coupon_code}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${presetStyle.codeBtn}`}
                aria-label={copied ? "Coupon code copied" : `Copy coupon code ${banner.coupon_code}`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{banner.cta_text || "Copy"}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Terms link */}
          {banner.terms_url && (
            <a
              href={banner.terms_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] opacity-80 hover:opacity-100 underline transition-opacity"
            >
              <span>Terms</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
