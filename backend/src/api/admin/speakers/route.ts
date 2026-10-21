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

  const filters: Record<string, any> = {}
  if (query.status && query.status !== "all") {
    filters.status = query.status
  }
  if (query.featured === "true") {
    filters.is_featured = true
  }

  const limit = parseInt(query.limit as string) || 100
  const offset = parseInt(query.offset as string) || 0

  const [speakers, count] = await (webinarService as any).listAndCountSpeakers(filters, {
    take: limit,
    skip: offset,
    order: { featured_order: "ASC", name: "ASC" },
  })

  // Attach associated webinars count and details for each speaker
  let allWebinars: any[] = []
  try {
    allWebinars = await webinarService.listWebinars({})
  } catch (e) {
    // continue
  }

  let speakersWithWebinars = speakers.map((spk: any) => {
    const associated = allWebinars.filter(
      (w: any) =>
        w.speaker_id === spk.id ||
        (w.speaker_name && w.speaker_name.toLowerCase() === spk.name.toLowerCase())
    )
    const webinarList = associated.map((w: any) => ({
      id: w.id,
      title: w.title,
      event_date: w.event_date,
      status: w.status,
    }))
    return {
      ...spk,
      is_featured: Boolean(spk.is_featured),
      featured_order: Number(spk.featured_order) || 0,
      specialty: spk.specialty || (spk.metadata as any)?.specialty || null,
      webinars_count: associated.length,
      associated_webinars: webinarList,
      active_webinars: webinarList,
      webinars: webinarList,
    }
  })

  // Sort by featured_order ASC then name ASC
  speakersWithWebinars.sort((a: any, b: any) => {
    if ((a.featured_order || 0) !== (b.featured_order || 0)) {
      return (a.featured_order || 0) - (b.featured_order || 0)
    }
    return (a.name || "").localeCompare(b.name || "")
  })

  if (query.q) {
    const q = query.q.toLowerCase()
    speakersWithWebinars = speakersWithWebinars.filter(
      (s: any) =>
        s.name.toLowerCase().includes(q) ||
        (s.designation && s.designation.toLowerCase().includes(q)) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        (s.specialty && s.specialty.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    )
  }

  res.json({
    speakers: speakersWithWebinars,
    count: speakersWithWebinars.length,
    limit,
    offset,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const body = req.body as Record<string, any>

  if (!body.name) {
    return res.status(400).json({ message: "Speaker name is required" })
  }

  const slug =
    body.slug ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")

  const isFeatured = body.is_featured !== undefined ? Boolean(body.is_featured) : false
  const featuredOrder = Number(body.featured_order) || 0
  const specialty = body.specialty || null

  const metadata = {
    ...(body.metadata || {}),
    is_featured: isFeatured,
    featured_order: featuredOrder,
    specialty,
  }

  const speaker = await (webinarService as any).createSpeakers({
    name: body.name,
    slug,
    bio: body.bio || null,
    designation: body.designation || null,
    qualifications: body.qualifications || null,
    photo_url: body.photo_url || null,
    email: body.email || null,
    phone: body.phone || null,
    status: body.status || "active",
    is_featured: isFeatured,
    featured_order: featuredOrder,
    specialty,
    metadata,
  })

  res.status(201).json({ speaker })
}
