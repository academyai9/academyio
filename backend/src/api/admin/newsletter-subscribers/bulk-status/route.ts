import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureNewsletterTables } from "../../../../utils/newsletter-db"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureNewsletterTables(pgConnection)

    const body = (req.body as any) || {}
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
    const status = body.status === "unsubscribed" ? "unsubscribed" : "active"
    const reason = body.reason || "Bulk action executed by administrator via Super Admin Panel"

    if (ids.length === 0) {
      return res.status(400).json({ error: "No subscriber IDs provided." })
    }

    if (status === "unsubscribed") {
      await pgConnection.raw(
        `UPDATE newsletter_subscribers 
         SET status = 'unsubscribed', 
             unsubscribed_at = NOW(), 
             unsubscribe_reason = ?, 
             updated_at = NOW() 
         WHERE id = ANY(?::text[])`,
        [reason, ids]
      )
    } else {
      await pgConnection.raw(
        `UPDATE newsletter_subscribers 
         SET status = 'active', 
             unsubscribed_at = NULL, 
             unsubscribe_reason = NULL, 
             verified_at = COALESCE(verified_at, NOW()), 
             updated_at = NOW() 
         WHERE id = ANY(?::text[])`,
        [ids]
      )
    }

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${ids.length} subscriber(s) to ${status}.`,
      count: ids.length,
      status,
    })
  } catch (error: any) {
    console.error("[Bulk Status Newsletter Subscribers] Error:", error)
    return res.status(500).json({ error: error.message || "Failed to update subscriber statuses." })
  }
}
