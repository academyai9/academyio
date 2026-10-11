import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const query = req.query as Record<string, any>

  const filters: Record<string, any> = {}
  if (query.status) {
    filters.status = query.status
  }
  if (query.category) {
    filters.category = query.category
  }

  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0

  const [webinars, count] = await webinarService.listAndCountWebinars(filters, {
    take: limit,
    skip: offset,
    order: { event_date: "DESC" },
    relations: ["resources", "entitlements"],
  })

  res.json({
    webinars,
    count,
    limit,
    offset,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const body = req.body as Record<string, any>

  if (!body.title || !body.speaker_name || !body.event_date) {
    return res.status(400).json({ message: "Title, speaker name, and event date are required" })
  }

  const slug =
    body.slug ||
    body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

  // 1. Create Webinar entity
  const webinar = await webinarService.createWebinars({
    title: body.title,
    slug,
    short_description: body.short_description || null,
    description: body.description || null,
    featured_image: body.featured_image || null,
    speaker_name: body.speaker_name,
    speaker_bio: body.speaker_bio || null,
    speaker_photo: body.speaker_photo || null,
    speaker_title: body.speaker_title || null,
    event_date: new Date(body.event_date),
    start_time: body.start_time || "1:00 PM EST",
    end_time: body.end_time || "2:40 PM EST",
    timezone: body.timezone || "America/New_York",
    duration_minutes: body.duration_minutes || 100,
    category: body.category || "Tax & Accounting",
    tags: body.tags || [],
    learning_objectives: body.learning_objectives || [],
    target_audience: body.target_audience || null,
    cpe_credits: body.cpe_credits || 2,
    registration_deadline: body.registration_deadline ? new Date(body.registration_deadline) : null,
    max_attendees: body.max_attendees || null,
    status: body.status || "published",
    is_featured: body.is_featured || false,
    is_upcoming: body.is_upcoming !== undefined ? body.is_upcoming : true,
    is_ondemand: body.is_ondemand || false,
    is_seminar: body.is_seminar || false,
    refund_policy: body.refund_policy || "Full refund available up to 24 hours prior to live event broadcast.",
    live_stream_url: body.live_stream_url || null,
    live_instructions: body.live_instructions || null,
    live_link_published: body.live_link_published || false,
    recording_url: body.recording_url || null,
    recording_instructions: body.recording_instructions || null,
    recording_expires_at: body.recording_expires_at ? new Date(body.recording_expires_at) : null,
    transcript_content: body.transcript_content || null,
    transcript_file_url: body.transcript_file_url || null,
  })

  // 2. Automatically create linked Medusa Product with 5 standard variants
  try {
    const product = await productModule.createProducts({
      title: body.title,
      handle: slug,
      description: body.short_description || body.description || body.title,
      status: "published",
      options: [
        {
          title: "Access Option",
          values: [
            "Live Webinar Access",
            "Recorded Webinar",
            "Webinar Transcript",
            "PDF Download",
            "Complete Package (All Included)",
          ],
        },
      ],
      variants: [
        {
          title: "Live Webinar Access",
          sku: `WEB-${webinar.id.slice(-6)}-LIVE`.toUpperCase(),
          options: { "Access Option": "Live Webinar Access" },
        },
        {
          title: "Recorded Webinar",
          sku: `WEB-${webinar.id.slice(-6)}-REC`.toUpperCase(),
          options: { "Access Option": "Recorded Webinar" },
        },
        {
          title: "Webinar Transcript",
          sku: `WEB-${webinar.id.slice(-6)}-TRS`.toUpperCase(),
          options: { "Access Option": "Webinar Transcript" },
        },
        {
          title: "PDF Download",
          sku: `WEB-${webinar.id.slice(-6)}-PDF`.toUpperCase(),
          options: { "Access Option": "PDF Download" },
        },
        {
          title: "Complete Package: Live + Recording + Transcript + PDF",
          sku: `WEB-${webinar.id.slice(-6)}-BND`.toUpperCase(),
          options: { "Access Option": "Complete Package (All Included)" },
        },
      ],
    })

    // Update webinar with product_id
    await webinarService.updateWebinars({
      id: webinar.id,
      product_id: product.id,
    })

    // Create variant mappings
    const variantMappings = [
      { type: "live", incLive: true, incRec: false, incTrs: false, incPdf: false },
      { type: "recording", incLive: false, incRec: true, incTrs: false, incPdf: false },
      { type: "transcript", incLive: false, incRec: false, incTrs: true, incPdf: false },
      { type: "pdf", incLive: false, incRec: false, incTrs: false, incPdf: true },
      { type: "bundle", incLive: true, incRec: true, incTrs: true, incPdf: true },
    ]

    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i]
      const config = variantMappings[i] || variantMappings[0]
      await webinarService.createWebinarVariantMappings({
        webinar_id: webinar.id,
        variant_id: variant.id,
        option_type: config.type as any,
        includes_live: config.incLive,
        includes_recording: config.incRec,
        includes_transcript: config.incTrs,
        includes_pdf: config.incPdf,
      })
    }

    (webinar as any).product_id = product.id
  } catch (err) {
    // If product creation encounters issue, return webinar record
  }

  res.status(201).json({ webinar })
}
