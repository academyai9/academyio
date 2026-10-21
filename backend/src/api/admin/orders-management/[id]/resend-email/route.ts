import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OrderConfirmationService } from "../../../../../modules/webinar/order-confirmation-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const body = (req.body as any) || {}
  const customRecipient = body.custom_recipient ? String(body.custom_recipient).trim().toLowerCase() : undefined

  if (!id) {
    return res.status(400).json({ message: "Order ID is required." })
  }

  try {
    const adminUserId = (req as any).auth_context?.actor_id || "admin"
    const adminEmail = (req as any).auth_context?.email || "admin@academyio.com"

    console.log(`[Admin Resend Email] Initiated by ${adminEmail} for order ${id}`)

    const result = await OrderConfirmationService.sendOrderConfirmation(id, {
      forceResend: true,
      customRecipient,
      adminUserId,
      adminEmail,
    })

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to dispatch confirmation email.",
        error: result.error,
        notification_id: result.notificationId,
      })
    }

    const updatedNotif = await OrderConfirmationService.getNotificationForOrder(id)

    return res.status(200).json({
      success: true,
      message: `Order confirmation email resent successfully to ${result.recipient}.`,
      notification: updatedNotif,
    })
  } catch (error: any) {
    console.error("[Admin Resend Email Error]:", error)
    return res.status(500).json({
      message: "An error occurred while resending the confirmation email.",
      error: error.message,
    })
  }
}
