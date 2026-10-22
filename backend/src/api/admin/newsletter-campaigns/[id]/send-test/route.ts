import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { dispatchNewsletterCampaign } from "../../../../../utils/newsletter-email"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as any) || {}
    const testRecipient = typeof body.test_recipient === "string" ? body.test_recipient.trim() : ""

    if (!testRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient)) {
      return res.status(400).json({ error: "A valid test recipient email address is required." })
    }

    const result = await dispatchNewsletterCampaign(pgConnection, {
      campaignId: id,
      isTest: true,
      testRecipient,
    })

    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to send test email." })
    }

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${testRecipient}.`,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to send test email." })
  }
}
