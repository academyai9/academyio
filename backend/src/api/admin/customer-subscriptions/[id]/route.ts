import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [sub] = await webinarService.listCustomerSubscriptions({ id })
  if (!sub) {
    return res.status(404).json({ message: "Subscription not found" })
  }

  const [plan] = await webinarService.listSubscriptionPlans({ id: sub.plan_id })

  res.json({
    subscription: {
      ...sub,
      plan: plan || null,
    },
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const [sub] = await webinarService.listCustomerSubscriptions({ id })
  if (!sub) {
    return res.status(404).json({ message: "Subscription not found" })
  }

  const updateData: Record<string, any> = { id }

  if (body.status !== undefined) {
    updateData.status = body.status
    if (body.status === "active") {
      updateData.cancel_at_period_end = false
      updateData.canceled_at = null
      // If subscription was expired or end date is in past, give 30 days fresh access
      const now = new Date()
      const end = new Date(sub.current_period_end)
      if (end <= now) {
        const nextMonth = new Date(now)
        nextMonth.setDate(nextMonth.getDate() + 30)
        updateData.current_period_end = nextMonth
      }
    } else if (body.status === "canceled") {
      updateData.cancel_at_period_end = true
      updateData.canceled_at = new Date()
    }
  }

  if (body.cancel_at_period_end !== undefined)
    updateData.cancel_at_period_end = Boolean(body.cancel_at_period_end)
  if (body.canceled_at !== undefined)
    updateData.canceled_at = body.canceled_at ? new Date(body.canceled_at) : null
  if (body.current_period_end !== undefined)
    updateData.current_period_end = new Date(body.current_period_end)
  if (body.extend_days) {
    const days = parseInt(body.extend_days, 10) || 30
    const base = new Date(sub.current_period_end) > new Date() ? new Date(sub.current_period_end) : new Date()
    base.setDate(base.getDate() + days)
    updateData.current_period_end = base
    updateData.status = "active"
    updateData.cancel_at_period_end = false
  }
  if (body.monthly_access_used !== undefined)
    updateData.monthly_access_used = parseInt(body.monthly_access_used)

  const updatedSub = await webinarService.updateCustomerSubscriptions(updateData)

  res.json({
    message: "Subscription updated successfully",
    subscription: updatedSub,
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [sub] = await webinarService.listCustomerSubscriptions({ id })
  if (!sub) {
    return res.status(404).json({ message: "Subscription not found" })
  }

  await webinarService.deleteCustomerSubscriptions(id)

  res.json({
    message: "Subscription deleted successfully",
    deleted_id: id,
  })
}
