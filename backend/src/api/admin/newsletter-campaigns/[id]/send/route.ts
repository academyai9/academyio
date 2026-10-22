import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { dispatchNewsletterCampaign } from "../../../../../utils/newsletter-email"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const result = await dispatchNewsletterCampaign(pgConnection, {
      campaignId: id,
      isTest: false,
    })

    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to dispatch campaign." })
    }

    return res.status(200).json({
      success: true,
      message: `Campaign broadcast dispatched to ${result.sentCount} active subscribers (${result.failedCount} failed).`,
      stats: result,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to dispatch campaign." })
  }
}
