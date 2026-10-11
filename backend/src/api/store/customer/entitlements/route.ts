import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const customerId = (req as any).auth_context?.actor_id || (req.query.customer_id as string)

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to view customer entitlements" })
  }

  // Fetch all active entitlements for this customer
  const entitlements = await webinarService.listCustomerEntitlements(
    { customer_id: customerId, status: "active" },
    { relations: ["webinar", "webinar.resources"], order: { granted_at: "DESC" } }
  )

  // Group by webinar
  const webinarMap = new Map<string, any>()

  for (const ent of entitlements as any[]) {
    const web = ent.webinar
    if (!web) continue

    if (!webinarMap.has(web.id)) {
      webinarMap.set(web.id, {
        webinar: {
          id: web.id,
          title: web.title,
          slug: web.slug,
          speaker_name: web.speaker_name,
          event_date: web.event_date,
          start_time: web.start_time,
          end_time: web.end_time,
          timezone: web.timezone,
          is_upcoming: web.is_upcoming,
          is_ondemand: web.is_ondemand,
          featured_image: web.featured_image,
          cpe_credits: web.cpe_credits,
          category: web.category,
        },
        access: {
          has_live: false,
          has_recording: false,
          has_transcript: false,
          has_pdf: false,
          is_bundle: false,
        },
        entitlements: [],
      })
    }

    const item = webinarMap.get(web.id)
    item.entitlements.push({
      id: ent.id,
      access_type: ent.access_type,
      granted_at: ent.granted_at,
      expires_at: ent.expires_at,
      order_id: ent.order_id,
      variant_title: ent.variant_title,
    })

    if (ent.access_type === "bundle") {
      item.access.is_bundle = true
      item.access.has_live = true
      item.access.has_recording = true
      item.access.has_transcript = true
      item.access.has_pdf = true
    } else if (ent.access_type === "live") {
      item.access.has_live = true
    } else if (ent.access_type === "recording") {
      item.access.has_recording = true
    } else if (ent.access_type === "transcript") {
      item.access.has_transcript = true
    } else if (ent.access_type === "pdf") {
      item.access.has_pdf = true
    }
  }

  const purchasedWebinars = Array.from(webinarMap.values())

  // Calculate summary counts for the customer overview dashboard
  const summary = {
    total_orders_with_webinars: new Set(entitlements.map((e: any) => e.order_id).filter(Boolean)).size,
    total_purchased_webinars: purchasedWebinars.length,
    upcoming_live_count: purchasedWebinars.filter(
      (item) => item.access.has_live && item.webinar.is_upcoming
    ).length,
    recordings_count: purchasedWebinars.filter((item) => item.access.has_recording).length,
    transcripts_count: purchasedWebinars.filter((item) => item.access.has_transcript).length,
    pdf_downloads_count: purchasedWebinars.filter((item) => item.access.has_pdf).length,
  }

  res.json({
    summary,
    purchased_webinars: purchasedWebinars,
    raw_entitlements: entitlements,
  })
}
