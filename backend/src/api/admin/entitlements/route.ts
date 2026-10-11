import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const query = req.query as Record<string, any>

  const filters: Record<string, any> = {}
  if (query.customer_id) {
    filters.customer_id = query.customer_id
  }
  if (query.customer_email) {
    filters.customer_email = query.customer_email
  }
  if (query.status) {
    filters.status = query.status
  }
  if (query.order_id) {
    filters.order_id = query.order_id
  }

  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0

  const [entitlements, count] = await webinarService.listAndCountCustomerEntitlements(
    filters,
    {
      take: limit,
      skip: offset,
      relations: ["webinar"],
      order: { granted_at: "DESC" },
    }
  )

  res.json({
    entitlements,
    count,
    limit,
    offset,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const body = req.body as Record<string, any>

  if (!body.customer_id || !body.customer_email || !body.webinar_id || !body.access_type) {
    return res.status(400).json({
      message: "customer_id, customer_email, webinar_id, and access_type are required",
    })
  }

  const entitlement = await webinarService.createCustomerEntitlements({
    customer_id: body.customer_id,
    customer_email: body.customer_email,
    webinar_id: body.webinar_id,
    order_id: body.order_id || "ADMIN_MANUAL_GRANT",
    order_item_id: body.order_item_id || null,
    variant_id: body.variant_id || null,
    variant_title: body.variant_title || `Manual ${body.access_type} Grant`,
    access_type: body.access_type,
    status: "active",
    granted_at: new Date(),
    expires_at: body.expires_at ? new Date(body.expires_at) : null,
    metadata: {
      granted_by_admin: true,
      notes: body.notes || "Granted by administrator via admin portal",
      granted_at: new Date().toISOString(),
    },
  })

  res.status(201).json({ entitlement })
}
