import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const body = req.body as { ids?: string[] }
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : []

    if (ids.length === 0) {
      return res.status(400).json({ message: "No subscription IDs provided for deletion" })
    }

    let deletedCount = 0
    for (const id of ids) {
      try {
        await webinarService.deleteCustomerSubscriptions(id)
        deletedCount++
      } catch (e) {
        // continue with other ids
      }
    }

    res.json({
      message: `Successfully deleted ${deletedCount} subscription(s)`,
      count: deletedCount,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to bulk delete subscriptions", error: error.message })
  }
}
