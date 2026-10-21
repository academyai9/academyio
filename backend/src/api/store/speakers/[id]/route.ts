import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"
import { computeWebinarStatus } from "../../../../modules/webinar/utils/webinar-status"
import { ensureSpeakersInitialized } from "../../../../modules/webinar/utils/sync-speakers"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  try {
    await ensureSpeakersInitialized(webinarService)
  } catch (e) {
    // continue
  }

  // Try finding by id first, then fallback to slug
  let [speaker] = await (webinarService as any).listSpeakers({ id })
  if (!speaker) {
    const [bySlug] = await (webinarService as any).listSpeakers({ slug: id })
    speaker = bySlug
  }

  if (!speaker || speaker.status === "archived") {
    return res.status(404).json({ message: "Speaker not found" })
  }

  // Fetch all published webinars
  let candidateWebinars: any[] = []
  try {
    candidateWebinars = await webinarService.listWebinars(
      { status: "published" },
      { order: { event_date: "DESC" }, relations: ["resources"] }
    )
  } catch (e) {
    candidateWebinars = []
  }

  // Filter webinars for this speaker
  const speakerWebinars = candidateWebinars.filter(
    (w: any) =>
      w.speaker_id === speaker.id ||
      (w.speaker_name && w.speaker_name.toLowerCase() === speaker.name.toLowerCase())
  )

  // Fetch variant mappings
  let allMappings: any[] = []
  try {
    if (speakerWebinars.length > 0) {
      allMappings = await webinarService.listWebinarVariantMappings({
        webinar_id: speakerWebinars.map((w: any) => w.id),
      })
    }
  } catch (e) {
    // continue if mappings query fails
  }

  // Compute live timezone-aware status and public details for each webinar
  const enhancedWebinars = speakerWebinars.map((w: any) => {
    const computed = computeWebinarStatus(w)
    const { live_stream_url, live_instructions, recording_url, transcript_content, ...publicData } = w

    const webinarMappings = allMappings.filter(
      (m: any) => m.webinar_id === w.id && m.is_enabled !== false
    )
    const variants = webinarMappings
      .filter((m: any) => {
        if (computed.is_completed && m.option_type === "live") {
          return false
        }
        return true
      })
      .map((m: any) => ({
        id: m.variant_id || m.id,
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

    return {
      ...publicData,
      is_upcoming: computed.is_upcoming,
      is_ondemand: computed.is_ondemand,
      is_completed: computed.is_completed,
      recording_published: computed.recording_published,
      recording_ready: computed.recording_ready,
      recording_coming_soon: computed.recording_coming_soon,
      end_timestamp: computed.end_timestamp,
      display_badge: computed.display_badge,
      has_live: Boolean(w.live_stream_url && w.live_link_published && !computed.is_completed),
      has_recording: computed.recording_ready,
      has_transcript: Boolean(w.transcript_file_url || w.transcript_content),
      public_resources_count: w.resources?.filter((r: any) => r.is_published)?.length || 0,
      variants: variants.length > 0 ? variants : undefined,
    }
  })

  res.json({
    speaker: {
      ...speaker,
      webinars: enhancedWebinars,
      webinars_count: enhancedWebinars.length,
    },
  })
}
