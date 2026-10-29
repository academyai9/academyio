import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureNewsletterTables } from "../../../../utils/newsletter-db"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureNewsletterTables(pgConnection)

    const body = (req.body as any) || {}
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []

    if (ids.length === 0) {
      return res.status(400).json({ error: "No subscriber IDs provided for deletion." })
    }

    // Delete audit logs first if any exist
    try {
      await pgConnection.raw(
        `DELETE FROM newsletter_subscriber_audit_logs WHERE subscriber_id = ANY(?::text[])`,
        [ids]
      )
    } catch (e) {
      // Continue if audit table differs
    }

    // Delete subscribers
    const delRes = await pgConnection.raw(
      `DELETE FROM newsletter_subscribers WHERE id = ANY(?::text[]) RETURNING id, email`,
      [ids]
    )

    const deletedCount = (delRes.rows || []).length

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} subscriber(s).`,
      count: deletedCount,
      deleted_ids: (delRes.rows || []).map((r: any) => r.id),
    })
  } catch (error: any) {
    console.error("[Bulk Delete Newsletter Subscribers] Error:", error)
    return res.status(500).json({ error: error.message || "Failed to bulk delete subscribers." })
  }
}
