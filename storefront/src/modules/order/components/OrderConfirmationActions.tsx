"use client"

import React from "react"
import { Printer, CalendarPlus } from "lucide-react"

export function PrintReceiptButton() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 text-gray-700 dark:text-slate-200 text-xs font-semibold shadow-sm transition-all cursor-pointer print:hidden"
    >
      <Printer className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
      <span>Print / Save Receipt</span>
    </button>
  )
}

interface AddToCalendarProps {
  title: string
  description?: string
  startDate?: string | Date | null
  startTime?: string | null
  timezone?: string | null
}

export function AddToCalendarButton({
  title,
  description = "AcademyIO Live Accredited Webinar. Join portal for verified CPE attendance.",
  startDate,
  startTime = "14:00",
  timezone = "EDT",
}: AddToCalendarProps) {
  if (!startDate) return null

  const getCalendarLinks = () => {
    try {
      const dateObj = new Date(startDate)
      if (isNaN(dateObj.getTime())) return null

      // Parse hours/minutes if startTime provided
      let hours = 14
      let minutes = 0
      if (startTime) {
        const timeMatch = startTime.match(/(\d+):(\d+)/)
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10)
          minutes = parseInt(timeMatch[2], 10)
          if (startTime.toLowerCase().includes("pm") && hours < 12) hours += 12
          if (startTime.toLowerCase().includes("am") && hours === 12) hours = 0
        }
      }

      dateObj.setHours(hours, minutes, 0, 0)
      const endDateObj = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000) // 2 hour default duration

      const formatIsoUtc = (d: Date) =>
        d
          .toISOString()
          .replace(/-|:|\.\d+/g, "")

      const startUtc = formatIsoUtc(dateObj)
      const endUtc = formatIsoUtc(endDateObj)

      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(
        description
      )}&location=${encodeURIComponent("AcademyIO Live Webinar Portal")}`

      // Build .ics data string
      const icsData = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AcademyIO//Webinar CPE Platform//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `SUMMARY:${title.replace(/,/g, "\\,")}`,
        `DESCRIPTION:${description.replace(/,/g, "\\,")}`,
        "LOCATION:AcademyIO Live Webinar Portal",
        `DTSTART:${startUtc}`,
        `DTEND:${endUtc}`,
        `STATUS:CONFIRMED`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n")

      const icsHref = `data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`

      return { googleUrl, icsHref }
    } catch {
      return null
    }
  }

  const links = getCalendarLinks()
  if (!links) return null

  return (
    <div className="inline-flex items-center gap-1.5 print:hidden">
      <a
        href={links.googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
        title="Add to Google Calendar"
      >
        <CalendarPlus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        <span>Add to Google Cal</span>
      </a>
      <a
        href={links.icsHref}
        download={`${title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.ics`}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
        title="Download .ics for Outlook / Apple Calendar"
      >
        <span>.ICS</span>
      </a>
    </div>
  )
}
