import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"
import { ensureVariantPriceSet } from "../../../modules/webinar/utils/price-sync"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const query = req.query as Record<string, any>

  const filters: Record<string, any> = {}
  if (query.status && query.status !== "all") {
    filters.status = query.status
  }
  if (query.category && query.category !== "all") {
    filters.category = query.category
  }
  if (query.speaker_id) {
    filters.speaker_id = query.speaker_id
  }

  const limit = parseInt(query.limit as string) || 100
  const offset = parseInt(query.offset as string) || 0

  const [webinars, count] = await webinarService.listAndCountWebinars(filters, {
    take: limit,
    skip: offset,
    order: { event_date: "DESC" },
    relations: ["resources", "entitlements"],
  })

  // Load variant mappings to compute starting_price and variants_count
  const allMappings = await webinarService.listWebinarVariantMappings({})
  let enhancedWebinars = webinars.map((w: any) => {
    const mappings = allMappings.filter((m: any) => m.webinar_id === w.id && m.is_enabled !== false)
    const prices = mappings.map((m: any) => Number(m.price)).filter((p: number) => !isNaN(p) && p > 0)
    const startingPrice = prices.length > 0 ? Math.min(...prices) : 149
    return {
      ...w,
      topics_covered: w.topics_covered || (w.metadata as any)?.topics_covered || [],
      starting_price: startingPrice,
      variants_count: mappings.length,
      variants: mappings,
    }
  })

  if (query.q) {
    const q = query.q.toLowerCase()
    enhancedWebinars = enhancedWebinars.filter(
      (w: any) =>
        w.title.toLowerCase().includes(q) ||
        (w.speaker_name && w.speaker_name.toLowerCase().includes(q)) ||
        (w.category && w.category.toLowerCase().includes(q))
    )
  }

  if (query.date_filter === "upcoming") {
    const now = new Date()
    enhancedWebinars = enhancedWebinars.filter((w: any) => new Date(w.event_date) >= now)
  } else if (query.date_filter === "past") {
    const now = new Date()
    enhancedWebinars = enhancedWebinars.filter((w: any) => new Date(w.event_date) < now)
  }

  res.json({
    webinars: enhancedWebinars,
    count: enhancedWebinars.length,
    limit,
    offset,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body as Record<string, any>

  // Proactively ensure database columns exist on Neon PostgreSQL
  try {
    await pgConnection.raw(`
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "topics_covered" jsonb null;
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "target_audience" text null;
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "learning_objectives" jsonb null;
      ALTER TABLE IF EXISTS "webinar" ADD COLUMN IF NOT EXISTS "metadata" jsonb null;
    `)
  } catch (dbErr) {
    // Non-fatal
  }

  let speakerName = body.speaker_name
  let speakerBio = body.speaker_bio || null
  let speakerPhoto = body.speaker_photo || null
  let speakerTitle = body.speaker_title || null
  const speakerId = body.speaker_id || null

  if (speakerId) {
    try {
      const [spk] = await (webinarService as any).listSpeakers({ id: speakerId })
      if (spk) {
        speakerName = speakerName || spk.name
        speakerBio = speakerBio || spk.bio
        speakerPhoto = speakerPhoto || spk.photo_url
        speakerTitle = speakerTitle || spk.designation
      }
    } catch (e) {
      // ignore
    }
  }

  if (!body.title || !speakerName || !body.event_date) {
    return res.status(400).json({ message: "Title, speaker name, and event date are required" })
  }

  const slug =
    body.slug ||
    body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

  const topics = Array.isArray(body.topics_covered)
    ? body.topics_covered.map((t: any) => (typeof t === "string" ? t.trim() : "")).filter((t: string) => t.length > 0)
    : []

  const objectives = Array.isArray(body.learning_objectives)
    ? body.learning_objectives.map((o: any) => (typeof o === "string" ? o.trim() : "")).filter((o: string) => o.length > 0)
    : []

  // 1. Create Webinar entity
  const createData: Record<string, any> = {
    title: body.title,
    slug,
    short_description: body.short_description || null,
    description: body.description || null,
    featured_image: body.featured_image || null,
    speaker_name: speakerName,
    speaker_bio: speakerBio,
    speaker_photo: speakerPhoto,
    speaker_title: speakerTitle,
    speaker_id: speakerId,
    event_date: new Date(body.event_date),
    start_time: body.start_time || "1:00 PM EST",
    end_time: body.end_time || "2:40 PM EST",
    timezone: body.timezone || "America/New_York",
    duration_minutes: body.duration_minutes || 100,
    category: body.category || "Federal Taxation",
    tags: body.tags || [],
    learning_objectives: objectives,
    target_audience: body.target_audience || null,
    topics_covered: topics,
    cpe_credits: body.cpe_credits || 2,
    registration_deadline: body.registration_deadline ? new Date(body.registration_deadline) : null,
    max_attendees: body.max_attendees || null,
    status: body.status || "published",
    is_featured: body.is_featured || false,
    is_upcoming: body.is_upcoming !== undefined ? body.is_upcoming : true,
    is_ondemand: body.is_ondemand || false,
    is_seminar: false,
    refund_policy: body.refund_policy || "Full refund available up to 24 hours prior to live event broadcast.",
    seo_title: body.seo_title || `${body.title} | AcademyIO Webinar`,
    seo_description: body.seo_description || body.short_description || null,
    live_stream_url: body.live_stream_url || null,
    live_instructions: body.live_instructions || null,
    live_link_published: body.live_link_published || false,
    recording_url: body.recording_url || null,
    recording_instructions: body.recording_instructions || null,
    recording_expires_at: body.recording_expires_at ? new Date(body.recording_expires_at) : null,
    recording_published: body.recording_published || false,
    transcript_content: body.transcript_content || null,
    transcript_file_url: body.transcript_file_url || null,
    metadata: {
      ...(body.metadata || {}),
      topics_covered: topics,
    },
  }

  let webinar: any = null
  try {
    webinar = await webinarService.createWebinars(createData as any)
  } catch (err: any) {
    console.warn("[Webinar Create] Primary create failed, trying fallback without direct topics_covered column:", err?.message)
    if (createData.topics_covered !== undefined) {
      const fallbackData = { ...createData }
      delete fallbackData.topics_covered
      webinar = await webinarService.createWebinars(fallbackData as any)
    } else {
      return res.status(500).json({
        message: err?.message || "Failed to create webinar",
        detail: err?.detail || null,
      })
    }
  }

  // 2. Automatically create linked Medusa Product with 4 standard variants or custom options
  try {
    const customOptions = body.custom_options || [
      {
        title: "Live Webinar Access",
        type: "live",
        price: body.prices?.live || 149,
        incLive: true,
        incRec: false,
        incTrs: false,
        incPdf: false,
      },
      {
        title: "Recorded Webinar",
        type: "recording",
        price: body.prices?.recording || 149,
        incLive: false,
        incRec: true,
        incTrs: false,
        incPdf: false,
      },
      {
        title: "Webinar Transcript",
        type: "transcript",
        price: body.prices?.transcript || 49,
        incLive: false,
        incRec: false,
        incTrs: true,
        incPdf: false,
      },
      {
        title: "Complete Package: Live + Recording + Transcript + PDF",
        type: "bundle",
        price: body.prices?.bundle || 249,
        incLive: true,
        incRec: true,
        incTrs: true,
        incPdf: true,
      },
    ]

    let salesChannels: any[] = []
    try {
      const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL)
      const scList = await salesChannelService.listSalesChannels()
      if (scList && scList.length) {
        salesChannels = [{ id: scList[0].id }]
      }
    } catch (e) {
      // ignore
    }

    const product = await (productModule.createProducts as any)({
      title: body.title,
      handle: slug,
      description: body.short_description || body.description || body.title,
      status: body.status === "draft" ? "draft" : "published",
      sales_channels: salesChannels,
      options: [
        {
          title: "Access Option",
          values: customOptions.map((opt: any) => opt.title),
        },
      ],
      variants: customOptions.map((opt: any, idx: number) => ({
        title: opt.title,
        sku: `WEB-${webinar.id.slice(-6)}-${opt.type.toUpperCase().slice(0, 4)}-${idx + 1}`,
        options: { "Access Option": opt.title },
        manage_inventory: false,
      })),
    })

    // Update webinar with product_id
    await webinarService.updateWebinars({
      id: webinar.id,
      product_id: product.id,
    })

    // Create variant mappings with individual custom prices AND ensure Price Sets are created
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i]
      const config = customOptions[i] || customOptions[0]
      const priceAmount = Number(config.price) || 99
      const currency = (body.currency_code || "usd").toLowerCase()

      await webinarService.createWebinarVariantMappings({
        webinar_id: webinar.id,
        variant_id: variant.id,
        option_type: config.type,
        title: config.title,
        price: priceAmount,
        currency_code: currency,
        is_enabled: true,
        order_index: i + 1,
        includes_live: config.incLive,
        includes_recording: config.incRec,
        includes_transcript: config.incTrs,
        includes_pdf: config.incPdf,
      })

      // Link Medusa Pricing module Price Set
      await ensureVariantPriceSet(req.scope, variant.id, priceAmount, currency)
    }

    ;(webinar as any).product_id = product.id
  } catch (err) {
    // If product creation encounters issue, continue
  }

  res.status(201).json({ webinar })
}
