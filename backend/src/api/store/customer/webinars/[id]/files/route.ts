import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const webinarId = req.params.id
    const customerId = (req as any).auth_context?.actor_id || (req.query.customer_id as string)

    if (!customerId) {
      return res.status(401).json({ message: "Authentication required to access webinar materials." })
    }

    // 1. Verify Customer Access Rights for this Webinar
    // Check customer_entitlement
    const entRes = await pgConnection.raw(
      `
      SELECT id, access_type, status, expires_at
      FROM customer_entitlement
      WHERE customer_id = $1 AND webinar_id = $2 AND status = 'active' AND deleted_at IS NULL
    `,
      [customerId, webinarId]
    )

    // Check customer_subscription
    const subRes = await pgConnection.raw(
      `
      SELECT id, status, current_period_end
      FROM customer_subscription
      WHERE customer_id = $1 AND status = 'active' AND deleted_at IS NULL
    `,
      [customerId]
    )

    // Check paid orders for this webinar
    const orderRes = await pgConnection.raw(
      `
      SELECT o.id, o.status, oli.variant_id, oli.title, wvm.option_type
      FROM "order" o
      JOIN order_line_item oli ON oli.order_id = o.id
      JOIN webinar w ON w.id = $2
      LEFT JOIN webinar_variant_mapping wvm ON wvm.variant_id = oli.variant_id
      WHERE o.customer_id = $1
        AND (oli.product_id = w.product_id OR oli.metadata->>'webinar_id' = $2)
        AND o.deleted_at IS NULL
        AND o.status NOT IN ('canceled', 'archived')
    `,
      [customerId, webinarId]
    )

    const hasActiveSubscription = subRes.rows && subRes.rows.length > 0
    const entitlements = entRes.rows || []
    const orders = orderRes.rows || []

    const isAuthorized = hasActiveSubscription || entitlements.length > 0 || orders.length > 0

    if (!isAuthorized) {
      return res.status(403).json({
        message: "You have not purchased access to this webinar or your access has expired.",
        authorized: false,
      })
    }

    // Determine granted access types
    const accessTypes = new Set<string>()
    if (hasActiveSubscription) {
      accessTypes.add("bundle")
      accessTypes.add("all")
    }

    for (const ent of entitlements) {
      if (!ent.expires_at || new Date(ent.expires_at) > new Date()) {
        accessTypes.add(ent.access_type)
      }
    }

    for (const ord of orders) {
      if (ord.option_type) {
        accessTypes.add(ord.option_type)
      } else {
        // Default to bundle if option_type is not explicitly mapped
        accessTypes.add("bundle")
      }
    }

    const hasFullAccess = accessTypes.has("bundle") || accessTypes.has("all")

    // 2. Query Active Files for this Webinar
    const filesRes = await pgConnection.raw(
      `
      SELECT 
        id,
        webinar_id,
        purchase_option,
        variant_id,
        material_type,
        title,
        description,
        file_name,
        file_size,
        mime_type,
        display_order,
        created_at
      FROM webinar_file
      WHERE webinar_id = $1 AND is_active = true AND deleted_at IS NULL
      ORDER BY display_order ASC, created_at ASC;
    `,
      [webinarId]
    )

    const allFiles = filesRes.rows || []

    // 3. Filter files based on customer's authorized purchase options
    const eligibleFiles = allFiles.filter((file: any) => {
      if (hasFullAccess) return true
      if (file.purchase_option === "all") return true

      // Matching specific purchase option
      if (accessTypes.has(file.purchase_option)) return true

      // If purchased recording, allow handout/slides as well
      if (accessTypes.has("recording") && (file.material_type === "slides" || file.material_type === "handout" || file.material_type === "worksheet")) {
        return true
      }

      // If purchased transcript, allow handouts as well
      if (accessTypes.has("transcript") && (file.material_type === "slides" || file.material_type === "handout" || file.material_type === "worksheet")) {
        return true
      }

      // If purchased pdf/download, allow slides/handouts/worksheets
      if (accessTypes.has("pdf") && (file.material_type === "slides" || file.material_type === "handout" || file.material_type === "worksheet")) {
        return true
      }

      // If purchased live session, allow attendee handouts/slides
      if (accessTypes.has("live") && (file.material_type === "slides" || file.material_type === "handout" || file.material_type === "worksheet")) {
        return true
      }

      return false
    })

    res.json({
      webinar_id: webinarId,
      authorized: true,
      files: eligibleFiles,
      count: eligibleFiles.length,
    })
  } catch (error: any) {
    console.error("Error fetching customer webinar files:", error)
    res.status(500).json({
      message: "Failed to fetch webinar files",
      error: error.message,
    })
  }
}
