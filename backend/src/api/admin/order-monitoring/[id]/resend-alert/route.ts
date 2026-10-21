import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OrderMonitoringEmailService } from "../../../../../modules/order-monitoring/email-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as Record<string, any>) || {}

    const incRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_incident WHERE id = ?;`,
      [id]
    )
    const incident = incRes.rows?.[0]
    if (!incident) {
      return res.status(404).json({ message: `Incident '${id}' not found` })
    }

    const customRecipient = body.recipient || undefined
    const sendResult = await OrderMonitoringEmailService.sendAlert(
      pgConnection,
      incident,
      customRecipient
    )

    if (sendResult.success) {
      res.json({
        success: true,
        message: `Alert email successfully resent to ${sendResult.recipient}`,
        messageId: sendResult.messageId,
      })
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to resend alert email: ${sendResult.error}`,
      })
    }
  } catch (error: any) {
    console.error("[Resend Alert Error]:", error)
    res.status(500).json({
      success: false,
      message: "Failed to resend alert email",
      error: error.message,
    })
  }
}
