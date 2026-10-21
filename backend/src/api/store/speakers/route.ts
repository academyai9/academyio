import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"
import { ensureSpeakersInitialized } from "../../../modules/webinar/utils/sync-speakers"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const query = req.query as Record<string, any>

  // Automatically ensure faculty speakers are initialized and linked
  try {
    await ensureSpeakersInitialized(webinarService)
  } catch (e) {
    // continue
  }

  const filters: Record<string, any> = { status: "active" }
  if (query.featured === "true" || query.homepage === "true") {
    filters.is_featured = true
  }

  const [speakers, count] = await (webinarService as any).listAndCountSpeakers(
    filters,
    { order: { featured_order: "ASC", name: "ASC" } }
  )

  let publishedWebinars: any[] = []
  try {
    publishedWebinars = await webinarService.listWebinars({ status: "published" })
  } catch (e) {
    // continue
  }

  const enrichedSpeakers = speakers.map((spk: any) => {
    const matchingWebinars = publishedWebinars.filter(
      (w: any) =>
        w.speaker_id === spk.id ||
        (w.speaker_name && w.speaker_name.toLowerCase() === spk.name.toLowerCase())
    )
    return {
      ...spk,
      is_featured: Boolean(spk.is_featured),
      featured_order: Number(spk.featured_order) || 0,
      specialty: spk.specialty || (spk.metadata as any)?.specialty || null,
      webinars_count: matchingWebinars.length,
    }
  })

  // Ensure sorting by featured_order ASC then name ASC
  enrichedSpeakers.sort((a: any, b: any) => {
    if ((a.featured_order || 0) !== (b.featured_order || 0)) {
      return (a.featured_order || 0) - (b.featured_order || 0)
    }
    return (a.name || "").localeCompare(b.name || "")
  })

  res.json({ speakers: enrichedSpeakers, count: enrichedSpeakers.length })
}
