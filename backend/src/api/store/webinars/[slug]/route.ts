import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"
import { computeWebinarStatus } from "../../../../modules/webinar/utils/webinar-status"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const productModule = req.scope.resolve(Modules.PRODUCT)
  const { slug } = req.params

  // Query webinar by slug or id
  const [bySlug] = await webinarService.listWebinars(
    { slug, status: "published" },
    { relations: ["resources"] }
  )

  let webinar = bySlug
  if (!webinar) {
    const [byId] = await webinarService.listWebinars(
      { id: slug, status: "published" },
      { relations: ["resources"] }
    )
    webinar = byId
  }

  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  // Fetch speaker if speaker_id exists
  let speaker: any = null
  if (webinar.speaker_id) {
    const [sp] = await webinarService.listSpeakers({ id: webinar.speaker_id })
    if (sp) {
      speaker = {
        id: sp.id,
        name: sp.name,
        title: (sp as any).title || sp.designation,
        bio: sp.bio,
        photo_url: sp.photo_url,
        designation: sp.designation,
        qualifications: sp.qualifications,
        email: sp.email,
        company: (sp as any).company,
      }
    }
  }

  // Fetch variant mappings
  const mappings = await webinarService.listWebinarVariantMappings({
    webinar_id: webinar.id,
  })

  // Fetch linked product and its variants if product_id exists
  let productVariants: any[] = []
  if (webinar.product_id) {
    try {
      const [product] = await productModule.listProducts(
        { id: webinar.product_id },
        { relations: ["variants", "options"] }
      )
      if (product && product.variants) {
        productVariants = product.variants
      }
    } catch (err) {
      // ignore
    }
  }

  // Build combined variants list from mappings (respecting is_enabled and custom prices)
  const variants: any[] = []
  for (const m of mappings) {
    if (m.is_enabled === false) continue

    const pVariant = productVariants.find((pv: any) => pv.id === m.variant_id)
    variants.push({
      id: m.variant_id || m.id,
      mapping_id: m.id,
      title: m.title || pVariant?.title || "Access Option",
      sku: pVariant?.sku || `SKU-${m.variant_id?.slice(-6) || m.id.slice(-6)}`,
      price: m.price !== null && m.price !== undefined ? m.price : 149,
      currency_code: m.currency_code || "usd",
      description: m.description || null,
      option_type: m.option_type || "live",
      order_index: m.order_index || 0,
      expires_in_days: m.expires_in_days || null,
      includes: {
        live: Boolean(m.includes_live),
        recording: Boolean(m.includes_recording),
        transcript: Boolean(m.includes_transcript),
        pdf: Boolean(m.includes_pdf),
      },
      metadata: pVariant?.metadata || null,
    })
  }

  // If product variants exist without mappings, add them as enabled default variants
  for (const pv of productVariants) {
    if (!variants.some((v) => v.id === pv.id)) {
      variants.push({
        id: pv.id,
        mapping_id: null,
        title: pv.title,
        sku: pv.sku,
        price: 149,
        currency_code: "usd",
        description: null,
        option_type: "live",
        order_index: variants.length + 1,
        expires_in_days: null,
        includes: {
          live: true,
          recording: false,
          transcript: false,
          pdf: false,
        },
        metadata: pv.metadata || null,
      })
    }
  }

  const computed = computeWebinarStatus(webinar)

  // Enrich variants with dynamic availability based on live status
  const enrichedVariants = variants.map((v) => {
    let isAvailable = true
    let availabilityReason: string | null = null

    if (v.option_type === "live" && computed.is_completed) {
      isAvailable = false
      availabilityReason = "Live session concluded"
    } else if (v.option_type === "recording" && !computed.recording_ready) {
      isAvailable = false
      availabilityReason = computed.is_completed
        ? "Recording being processed • Available soon"
        : "Recording available after live event broadcast"
    } else if (v.option_type === "bundle" && computed.is_completed && !computed.recording_ready) {
      isAvailable = false
      availabilityReason = "Recording being processed • Available soon"
    }

    return {
      ...v,
      is_available: isAvailable,
      availability_reason: availabilityReason,
    }
  })

  // Sort by order_index
  enrichedVariants.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

  // Fetch educational credits and organization accreditation info
  let creditInfo: any = null
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const creditRes = await pgConnection.raw(
      `SELECT * FROM webinar_credit_info WHERE webinar_id = ? AND deleted_at IS NULL;`,
      [webinar.id]
    )
    if (creditRes.rows && creditRes.rows.length > 0) {
      creditInfo = creditRes.rows[0]

      if (creditInfo.irs_course_id && (creditInfo.irs_course_id.includes("PJGWS") || creditInfo.irs_course_id !== "####")) {
        creditInfo.irs_course_id = "####"
      }

      const orgsRes = await pgConnection.raw(
        `SELECT code, name, short_name, logo_url, website_url, alt_text, description, default_credit_type FROM accreditation_organization WHERE deleted_at IS NULL AND is_enabled = true;`
      )
      const allOrgs = orgsRes.rows || []

      if (Array.isArray(creditInfo.organizations)) {
        creditInfo.organizations = creditInfo.organizations.map((assigned: any) => {
          const orgMeta = allOrgs.find((o: any) => o.code === assigned.org_code)
          const isIrs = assigned.org_code === "irs" || (assigned.course_id && String(assigned.course_id).includes("PJGWS"))
          return {
            ...assigned,
            course_id: isIrs ? "####" : assigned.course_id,
            name: orgMeta?.name || assigned.org_code?.toUpperCase(),
            short_name: orgMeta?.short_name || assigned.org_code?.toUpperCase(),
            logo_url: (orgMeta?.logo_url && !orgMeta.logo_url.endsWith(".svg"))
              ? orgMeta.logo_url
              : `/logos/${assigned.org_code}.png`,
            website_url: null,
            alt_text: orgMeta?.alt_text || `${assigned.org_code?.toUpperCase()} Accreditation`,
            description: orgMeta?.description || null,
            default_credit_type: orgMeta?.default_credit_type || "CPE Credits",
          }
        })
      }
    }
  } catch (e) {
    // continue if table not yet queried
  }

  // Sanitize: do not expose private links on the public product page
  const {
    live_stream_url,
    live_instructions,
    recording_url,
    transcript_content,
    ...publicWebinar
  } = webinar as any

  res.json({
    webinar: {
      ...publicWebinar,
      is_upcoming: computed.is_upcoming,
      is_ondemand: computed.is_ondemand,
      is_completed: computed.is_completed,
      recording_published: computed.recording_published,
      recording_ready: computed.recording_ready,
      recording_coming_soon: computed.recording_coming_soon,
      end_timestamp: computed.end_timestamp,
      display_badge: computed.display_badge,
      speaker,
      credit_info: creditInfo,
      variants: enrichedVariants,
      available_options: [
        {
          type: "live",
          label: "Live Webinar Access",
          available: !computed.is_completed,
          note: computed.is_completed ? "Concluded" : "Scheduled Broadcast",
        },
        {
          type: "recording",
          label: "Recorded Webinar",
          available: computed.recording_ready,
          note: computed.recording_ready
            ? "Instant HD Replay"
            : computed.is_completed
            ? "Recording Coming Soon"
            : "Included Post-Event",
        },
        {
          type: "transcript",
          label: "Webinar Transcript",
          available: Boolean(webinar.transcript_file_url || webinar.transcript_content),
          note: "Verbatim Written Text",
        },
        {
          type: "pdf",
          label: "PDF Download / Study Guide",
          available: true,
          note: "Downloadable Handouts & Guides",
        },
        {
          type: "bundle",
          label: "Complete Package (All Included)",
          available: !computed.is_completed || computed.recording_ready,
          note: "Full Access Pass",
        },
      ],
    },
  })
}
