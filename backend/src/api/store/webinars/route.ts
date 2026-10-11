import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const query = req.query as Record<string, any>

  const filters: Record<string, any> = {
    status: "published",
  }

  if (query.category) {
    filters.category = query.category
  }

  if (query.type === "upcoming") {
    filters.is_upcoming = true
  } else if (query.type === "ondemand") {
    filters.is_ondemand = true
  } else if (query.type === "seminar") {
    filters.is_seminar = true
  }

  if (query.featured === "true") {
    filters.is_featured = true
  }

  const limit = parseInt(query.limit as string) || 20
  const offset = parseInt(query.offset as string) || 0

  const [webinars, count] = await webinarService.listAndCountWebinars(filters, {
    take: limit,
    skip: offset,
    order: { event_date: "ASC" },
    relations: ["resources"],
  })

  // Filter in-memory if search parameter is present
  let result = webinars
  if (query.search && typeof query.search === "string") {
    const searchLower = query.search.toLowerCase()
    result = result.filter(
      (w: any) =>
        w.title?.toLowerCase().includes(searchLower) ||
        w.speaker_name?.toLowerCase().includes(searchLower) ||
        w.short_description?.toLowerCase().includes(searchLower) ||
        w.category?.toLowerCase().includes(searchLower)
    )
  }

  // Sanitize: never expose unpublished live links or secret meeting credentials in public list
  const sanitized = result.map((w: any) => {
    const { live_stream_url, live_instructions, recording_url, transcript_content, ...publicData } = w
    return {
      ...publicData,
      has_live: Boolean(w.live_stream_url && w.live_link_published),
      has_recording: Boolean(w.recording_url),
      has_transcript: Boolean(w.transcript_file_url || w.transcript_content),
      public_resources_count: w.resources?.filter((r: any) => r.is_published)?.length || 0,
    }
  })

  res.json({
    webinars: sanitized,
    count: query.search ? sanitized.length : count,
    limit,
    offset,
  })
}
