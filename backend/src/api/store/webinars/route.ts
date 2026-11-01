import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"
import { computeWebinarStatus } from "../../../modules/webinar/utils/webinar-status"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const query = req.query as Record<string, any>

  const filters: Record<string, any> = {
    status: "published",
  }

  const SLUG_TO_CATEGORY: Record<string, string> = {
    "accounting": "Accounting",
    "healthcare": "Healthcare",
    "housing": "Housing",
    "human-resources-payroll": "Human Resources & Payroll",
    "human-resources-and-payroll": "Human Resources & Payroll",
    "human resources & payroll": "Human Resources & Payroll",
    "taxation": "Taxation",
    "technology": "Technology",
  }

  if (query.category) {
    const rawCat = (query.category as string).trim()
    const mapped = SLUG_TO_CATEGORY[rawCat.toLowerCase()] || rawCat
    filters.category = mapped
  }

  if (query.featured === "true") {
    filters.is_featured = true
  }

  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0

  // Fetch webinars matching base category / status
  const [webinars, count] = await webinarService.listAndCountWebinars(filters, {
    take: 100, // retrieve candidate pool to accurately filter by computed status
    order: { event_date: "ASC" },
    relations: ["resources"],
  })

  // Fetch variant mappings for candidate webinars
  let allMappings: any[] = []
  try {
    allMappings = await webinarService.listWebinarVariantMappings({
      webinar_id: webinars.map((w: any) => w.id),
    })
  } catch (e) {
    // continue if mappings query fails
  }

  // Compute live timezone-aware status for each webinar
  let enhanced = webinars.map((w: any) => {
    const computed = computeWebinarStatus(w)
    const { live_stream_url, live_instructions, recording_url, transcript_content, ...publicData } = w

    const webinarMappings = allMappings.filter(
      (m: any) => m.webinar_id === w.id && m.is_enabled !== false
    )
    const variants = webinarMappings
      .filter((m: any) => {
        // For completed events, completely exclude live-only attendance options
        if (computed.is_completed && m.option_type === "live") {
          return false
        }
        return true
      })
      .map((m: any) => ({
        id: (m.variant_id && !m.variant_id.startsWith("wvm_") && !m.variant_id.startsWith("var_custom_")) ? m.variant_id : (m.variant_id || m.id),
        mapping_id: m.id,
        title: m.title || "Access Option",
        price: m.price !== null && m.price !== undefined ? m.price : 149,
        currency_code: m.currency_code || "usd",
        option_type: m.option_type || "live",
        includes: {
          live: Boolean(!computed.is_completed && m.includes_live),
          recording: Boolean(m.includes_recording),
          transcript: Boolean(m.includes_transcript),
          pdf: Boolean(m.includes_pdf),
        },
      }))

    const hasRecordingAvailable = Boolean(
      computed.recording_ready ||
      (recording_url && computed.recording_published !== false)
    )

    return {
      ...publicData,
      is_upcoming: computed.is_upcoming,
      is_ondemand: computed.is_ondemand,
      is_completed: computed.is_completed,
      recording_published: computed.recording_published,
      recording_ready: computed.recording_ready || hasRecordingAvailable,
      recording_coming_soon: computed.recording_coming_soon,
      end_timestamp: computed.end_timestamp,
      display_badge: computed.display_badge,
      has_live: Boolean(w.live_stream_url && w.live_link_published && !computed.is_completed),
      has_recording: hasRecordingAvailable,
      has_transcript: Boolean(w.transcript_file_url || w.transcript_content),
      public_resources_count: w.resources?.filter((r: any) => r.is_published)?.length || 0,
      variants: variants.length > 0 ? variants : undefined,
    }
  })

  // Filter by requested type based on real-time calculated status
  if (query.type === "upcoming") {
    enhanced = enhanced.filter((w: any) => w.is_upcoming === true)
  } else if (
    query.type === "self-study" ||
    query.type === "selfstudy" ||
    query.type === "ondemand"
  ) {
    enhanced = enhanced.filter(
      (w: any) =>
        w.is_ondemand === true ||
        w.recording_ready === true ||
        w.has_recording === true ||
        w.has_transcript === true ||
        w.public_resources_count > 0
    )
  } else if (query.type === "completed") {
    enhanced = enhanced.filter((w: any) => w.is_completed === true)
  } else if (query.type === "prerecorded" || query.type === "pre-recorded") {
    // Show completed or on-demand webinars that have video recordings
    enhanced = enhanced.filter(
      (w: any) =>
        w.recording_ready === true ||
        w.has_recording === true ||
        w.is_ondemand === true ||
        (w.is_completed === true && w.recording_published === true)
    )
    // Sort by most recently published/added recording first (newest available recording at top)
    enhanced.sort((a: any, b: any) => {
      const dateA = new Date(a.recording_expires_at || a.updated_at || a.event_date).getTime()
      const dateB = new Date(b.recording_expires_at || b.updated_at || b.event_date).getTime()
      return dateB - dateA
    })
  }

  // Filter by speaker if provided
  if (query.speaker_id) {
    enhanced = enhanced.filter((w: any) => w.speaker_id === query.speaker_id)
  } else if (query.speaker) {
    const speakerLower = (query.speaker as string).toLowerCase()
    enhanced = enhanced.filter((w: any) => w.speaker_name?.toLowerCase().includes(speakerLower))
  }

  // Filter by search query if provided
  if (query.search && typeof query.search === "string") {
    const searchLower = query.search.toLowerCase()
    enhanced = enhanced.filter(
      (w: any) =>
        w.title?.toLowerCase().includes(searchLower) ||
        w.speaker_name?.toLowerCase().includes(searchLower) ||
        w.short_description?.toLowerCase().includes(searchLower) ||
        w.category?.toLowerCase().includes(searchLower)
    )
  }

  const paginated = enhanced.slice(offset, offset + limit)

  res.json({
    webinars: paginated,
    count: enhanced.length,
    limit,
    offset,
  })
}
