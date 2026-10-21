/**
 * Timezone-aware Webinar Status and Expiration calculation utilities.
 */

const TIMEZONE_MAP: Record<string, string> = {
  EST: "America/New_York",
  EDT: "America/New_York",
  ET: "America/New_York",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  CT: "America/Chicago",
  MST: "America/Denver",
  MDT: "America/Denver",
  MT: "America/Denver",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  PT: "America/Los_Angeles",
  UTC: "UTC",
  GMT: "UTC",
}

export function normalizeTimezone(tz?: string | null): string {
  if (!tz) return "America/New_York"
  const upper = tz.trim().toUpperCase()
  if (TIMEZONE_MAP[upper]) {
    return TIMEZONE_MAP[upper]
  }
  try {
    // Validate if it is a valid IANA timezone
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return tz
  } catch {
    return "America/New_York"
  }
}

/**
 * Parses time string like "2:40 PM EST", "14:40", "1:00 PM" into hours (0-23) and minutes (0-59).
 */
export function parseTimeString(timeStr?: string | null): { hours: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== "string") return null

  const match = timeStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const ampm = match[3] ? match[3].toLowerCase() : null

  if (ampm === "pm" && hours < 12) {
    hours += 12
  } else if (ampm === "am" && hours === 12) {
    hours = 0
  }

  return { hours, minutes }
}

/**
 * Calculates the exact end timestamp of a webinar, taking event_date, end_time/start_time,
 * duration_minutes, and timezone into account with DST awareness.
 */
export function getWebinarEndTimestamp(webinar: {
  event_date: Date | string
  end_time?: string | null
  start_time?: string | null
  duration_minutes?: number | null
  timezone?: string | null
}): Date {
  const baseDate = new Date(webinar.event_date)
  if (isNaN(baseDate.getTime())) {
    return new Date(Date.now() - 3600000) // fallback past
  }

  const tz = normalizeTimezone(webinar.timezone)

  // Extract year, month, day in target timezone
  const dParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(baseDate)

  const y = parseInt(dParts.find((p) => p.type === "year")?.value || "2026", 10)
  const m = parseInt(dParts.find((p) => p.type === "month")?.value || "1", 10) - 1
  const d = parseInt(dParts.find((p) => p.type === "day")?.value || "1", 10)

  let targetHour = 14
  let targetMinute = 0

  const parsedEnd = parseTimeString(webinar.end_time)
  if (parsedEnd) {
    targetHour = parsedEnd.hours
    targetMinute = parsedEnd.minutes
  } else {
    const parsedStart = parseTimeString(webinar.start_time)
    const duration = webinar.duration_minutes || 60
    if (parsedStart) {
      const totalMinutes = parsedStart.hours * 60 + parsedStart.minutes + duration
      targetHour = Math.floor(totalMinutes / 60) % 24
      targetMinute = totalMinutes % 60
    }
  }

  // Convert (y, m, d, targetHour, targetMinute) in tz to UTC Date
  const guessUtc = new Date(Date.UTC(y, m, d, targetHour, targetMinute, 0))

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  })

  const parts = fmt.formatToParts(guessUtc)
  const partMap: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = parseInt(part.value, 10)
    }
  }

  const guessYear = partMap.year || y
  const guessMonth = (partMap.month || m + 1) - 1
  const guessDay = partMap.day || d
  let guessHour = partMap.hour || targetHour
  if (guessHour === 24) guessHour = 0
  const guessMinute = partMap.minute || targetMinute

  const tzAsUtcMs = Date.UTC(guessYear, guessMonth, guessDay, guessHour, guessMinute)
  const targetAsUtcMs = Date.UTC(y, m, d, targetHour, targetMinute)
  const diffMs = tzAsUtcMs - targetAsUtcMs

  return new Date(guessUtc.getTime() - diffMs)
}

export interface ComputedWebinarStatus {
  is_completed: boolean
  is_upcoming: boolean
  is_ondemand: boolean
  recording_published: boolean
  recording_ready: boolean
  recording_coming_soon: boolean
  end_timestamp: string
  display_badge: {
    label: string
    variant: "upcoming" | "ondemand" | "completed_pending" | "draft" | "archived"
  }
}

/**
 * Computes live runtime status for any webinar record.
 */
export function computeWebinarStatus(webinar: any, now = new Date()): ComputedWebinarStatus {
  const endTimestamp = getWebinarEndTimestamp(webinar)
  const isCompleted = now.getTime() >= endTimestamp.getTime()
  const isPublished = webinar.status === "published"
  const hasRecordingUrl = Boolean(webinar.recording_url)
  const recordingPublished = Boolean(
    webinar.recording_published === true ||
    (hasRecordingUrl && (webinar.is_ondemand || webinar.recording_published !== false))
  )
  const recordingReady = hasRecordingUrl && recordingPublished

  // Upcoming: published and end time hasn't passed, and not strictly an on-demand only course without live stream
  const isUpcoming = isPublished && !isCompleted && !(Boolean(webinar.is_ondemand) && hasRecordingUrl && !webinar.live_stream_url)

  // On-demand: has recording URL AND (marked ondemand OR event completed)
  const isOndemand = isPublished && (
    (hasRecordingUrl && recordingPublished) ||
    Boolean(webinar.is_ondemand) ||
    (isCompleted && hasRecordingUrl)
  )

  // Recording coming soon: completed but recording not yet published/uploaded
  const recordingComingSoon = isCompleted && !recordingReady && !isOndemand

  let label = "Upcoming Live Session"
  let variant: ComputedWebinarStatus["display_badge"]["variant"] = "upcoming"

  if (webinar.status === "draft") {
    label = "Draft"
    variant = "draft"
  } else if (webinar.status === "archived") {
    label = "Archived"
    variant = "archived"
  } else if (isOndemand) {
    label = "On-Demand Recording"
    variant = "ondemand"
  } else if (isCompleted) {
    label = "Live Ended • Recording Coming Soon"
    variant = "completed_pending"
  }

  return {
    is_completed: isCompleted,
    is_upcoming: isUpcoming,
    is_ondemand: isOndemand,
    recording_published: recordingPublished,
    recording_ready: recordingReady,
    recording_coming_soon: recordingComingSoon,
    end_timestamp: endTimestamp.toISOString(),
    display_badge: {
      label,
      variant,
    },
  }
}
