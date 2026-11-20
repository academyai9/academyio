import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const customerId = (req as any).auth_context?.actor_id

    if (!customerId) {
      return res.status(401).json({ message: "Authentication required to access webinar materials." })
    }

    // 1. Check Customer Subscription (must be active and not expired)
    const subRes = await pgConnection.raw(
      `
      SELECT id, status, current_period_end
      FROM customer_subscription
      WHERE customer_id = ? AND status = 'active' AND deleted_at IS NULL
        AND (current_period_end IS NULL OR current_period_end > NOW())
    `,
      [customerId]
    )
    const hasActiveSubscription = subRes.rows && subRes.rows.length > 0

    // 2. Check Customer Entitlements
    const entRes = await pgConnection.raw(
      `
      SELECT webinar_id, access_type, status, expires_at
      FROM customer_entitlement
      WHERE customer_id = ? AND status = 'active' AND deleted_at IS NULL
    `,
      [customerId]
    )

    // 3. Check Customer Orders (strictly via product_id — never untrusted metadata)
    const orderRes = await pgConnection.raw(
      `
      SELECT o.id, o.status, oli.variant_id, oli.title, wvm.option_type,
             w.id as webinar_id
      FROM "order" o
      JOIN order_line_item oli ON oli.order_id = o.id
      JOIN webinar w ON w.product_id = oli.product_id
      LEFT JOIN webinar_variant_mapping wvm ON wvm.variant_id = oli.variant_id
      WHERE o.customer_id = ?
        AND o.deleted_at IS NULL
        AND o.status NOT IN ('canceled', 'archived')
    `,
      [customerId]
    )

    // Build map of webinar_id -> Set of allowed access options
    const webinarAccessMap = new Map<string, Set<string>>()

    for (const ent of entRes.rows || []) {
      if (!ent.expires_at || new Date(ent.expires_at) > new Date()) {
        if (!webinarAccessMap.has(ent.webinar_id)) {
          webinarAccessMap.set(ent.webinar_id, new Set())
        }
        webinarAccessMap.get(ent.webinar_id)!.add(ent.access_type)
      }
    }

    for (const ord of orderRes.rows || []) {
      if (ord.webinar_id) {
        if (!webinarAccessMap.has(ord.webinar_id)) {
          webinarAccessMap.set(ord.webinar_id, new Set())
        }
        webinarAccessMap.get(ord.webinar_id)!.add(ord.option_type || "bundle")
      }
    }

    if (!hasActiveSubscription && webinarAccessMap.size === 0) {
      return res.json({ files: [], total: 0, subscription: false })
    }

    // Query active webinar files
    let query = `
      SELECT 
        wf.id,
        wf.webinar_id,
        wf.purchase_option,
        wf.variant_id,
        wf.material_type,
        wf.title,
        wf.description,
        wf.file_name,
        wf.file_size,
        wf.mime_type,
        wf.display_order,
        wf.created_at,
        w.title as webinar_title,
        w.slug as webinar_slug,
        w.speaker_name as webinar_speaker
      FROM webinar_file wf
      JOIN webinar w ON w.id = wf.webinar_id
      WHERE wf.is_active = true 
        AND wf.deleted_at IS NULL
        AND wf.upload_status = 'completed'
    `

    const params: any[] = []

    if (!hasActiveSubscription) {
      const authorizedWebinarIds = Array.from(webinarAccessMap.keys())
      params.push(authorizedWebinarIds)
      query += ` AND wf.webinar_id = ANY(?) `
    }

    query += ` ORDER BY w.title ASC, wf.display_order ASC, wf.created_at DESC `

    const filesRes = await pgConnection.raw(query, params)
    const rawFiles = filesRes.rows || []

    // If not subscribed, filter by each webinar's granted access options
    const authorizedFiles = rawFiles.filter((f: any) => {
      if (hasActiveSubscription) return true
      const options = webinarAccessMap.get(f.webinar_id)
      if (!options) return false

      if (options.has("bundle") || options.has("all")) return true
      if (f.purchase_option === "all") return true

      const opt = f.purchase_option?.toLowerCase()
      const mat = f.material_type?.toLowerCase()

      if (options.has(opt) || options.has(mat)) return true

      if (
        (options.has("live") || options.has("webinar")) &&
        (opt === "live" || mat === "slides" || mat === "handout")
      ) {
        return true
      }

      return false
    })

    return res.json({
      files: authorizedFiles,
      total: authorizedFiles.length,
      subscription: hasActiveSubscription,
    })
  } catch (error: any) {
    console.error("[Store Customer Webinar Files API Error]:", error)
    return res.status(500).json({
      message: "An internal server error occurred while retrieving webinar files.",
      error: error.message,
    })
  }
}
