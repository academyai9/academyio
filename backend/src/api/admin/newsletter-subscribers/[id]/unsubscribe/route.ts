import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { unsubscribeAdmin } from "../../../../../utils/newsletter-db"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as any) || {}
    const reason = typeof body.reason === "string" ? body.reason.trim() : "Unsubscribed via admin request"
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const updated = await unsubscribeAdmin(pgConnection, id, reason, adminUser)

    return res.status(200).json({
      success: true,
      message: `Subscriber ${updated.email} has been unsubscribed and suppressed from future campaigns.`,
      subscriber: updated,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to unsubscribe subscriber." })
  }
}
