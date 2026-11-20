import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const customerId = (req as any).auth_context?.actor_id
  const body = req.body as Record<string, any>

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const activeSubs = await webinarService.listCustomerSubscriptions({
    customer_id: customerId,
    status: "active",
  })

  if (!activeSubs || activeSubs.length === 0) {
    return res.status(404).json({ message: "No active subscription found to cancel" })
  }

  const subToCancel = activeSubs[0]
  const cancelImmediately = body.immediate === true

  const updatedSub = await webinarService.updateCustomerSubscriptions({
    id: subToCancel.id,
    cancel_at_period_end: true,
    canceled_at: new Date(),
    status: cancelImmediately ? "canceled" : "active",
  })

  res.json({
    message: cancelImmediately
      ? "Your subscription has been canceled immediately."
      : "Your subscription has been set to cancel at the end of the current billing period. You retain full access until then.",
    subscription: updatedSub,
  })
}
