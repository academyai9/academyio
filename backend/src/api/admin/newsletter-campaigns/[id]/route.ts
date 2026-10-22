import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureNewsletterTables } from "../../../../utils/newsletter-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureNewsletterTables(pgConnection)
    const { id } = req.params

    const cmpRes = await pgConnection.raw(
      `SELECT * FROM newsletter_campaigns WHERE id = ? LIMIT 1`,
      [id]
    )
    const campaign = cmpRes.rows?.[0]
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found." })
    }

    const logsRes = await pgConnection.raw(
      `SELECT * FROM newsletter_campaign_logs WHERE campaign_id = ? ORDER BY sent_at DESC LIMIT 100`,
      [id]
    )
    const logs = logsRes.rows || []

    return res.status(200).json({ campaign, logs })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to load campaign." })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureNewsletterTables(pgConnection)
    const { id } = req.params

    const cmpRes = await pgConnection.raw(
      `SELECT status FROM newsletter_campaigns WHERE id = ? LIMIT 1`,
      [id]
    )
    const campaign = cmpRes.rows?.[0]
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found." })
    }

    if (campaign.status === "sending") {
      return res.status(400).json({ error: "Cannot delete a campaign that is currently sending." })
    }

    await pgConnection.raw(`DELETE FROM newsletter_campaign_logs WHERE campaign_id = ?`, [id])
    await pgConnection.raw(`DELETE FROM newsletter_campaigns WHERE id = ?`, [id])

    return res.status(200).json({ success: true, message: "Campaign deleted." })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete campaign." })
  }
}
