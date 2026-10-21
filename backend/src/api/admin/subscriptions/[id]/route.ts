import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [plan] = await webinarService.listSubscriptionPlans({ id })
  if (!plan) {
    return res.status(404).json({ message: "Subscription plan not found" })
  }

  const subscriptions = await webinarService.listCustomerSubscriptions({
    plan_id: id,
  })

  res.json({
    plan: {
      ...plan,
      subscriptions,
      subscribers_count: subscriptions.length,
    },
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const [existingPlan] = await webinarService.listSubscriptionPlans({ id })
  if (!existingPlan) {
    return res.status(404).json({ message: "Subscription plan not found" })
  }

  const updateData: Record<string, any> = { id }

  if (body.name !== undefined) updateData.name = body.name
  if (body.slug !== undefined) updateData.slug = body.slug
  if (body.description !== undefined) updateData.description = body.description
  if (body.price !== undefined) updateData.price = parseFloat(body.price)
  if (body.currency_code !== undefined) updateData.currency_code = body.currency_code
  if (body.billing_interval !== undefined) updateData.billing_interval = body.billing_interval
  if (body.webinar_access_limit !== undefined) {
    updateData.webinar_access_limit =
      body.webinar_access_limit !== null && body.webinar_access_limit !== ""
        ? parseInt(body.webinar_access_limit)
        : null
  }
  if (body.includes_live !== undefined) updateData.includes_live = Boolean(body.includes_live)
  if (body.includes_recording !== undefined)
    updateData.includes_recording = Boolean(body.includes_recording)
  if (body.includes_transcript !== undefined)
    updateData.includes_transcript = Boolean(body.includes_transcript)
  if (body.includes_pdf !== undefined) updateData.includes_pdf = Boolean(body.includes_pdf)
  if (body.status !== undefined) updateData.status = body.status
  if (body.benefits !== undefined) {
    updateData.benefits = Array.isArray(body.benefits)
      ? body.benefits
      : typeof body.benefits === "string"
      ? body.benefits.split("\n").filter(Boolean)
      : []
  }
  if (body.order_index !== undefined) updateData.order_index = parseInt(body.order_index)
  if (body.metadata !== undefined) updateData.metadata = body.metadata

  const updatedPlan = await webinarService.updateSubscriptionPlans(updateData)

  res.json({
    message: "Subscription plan updated successfully",
    plan: updatedPlan,
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [existingPlan] = await webinarService.listSubscriptionPlans({ id })
  if (!existingPlan) {
    return res.status(404).json({ message: "Subscription plan not found" })
  }

  // Check active subscribers
  const activeSubs = await webinarService.listCustomerSubscriptions({
    plan_id: id,
    status: "active",
  })

  if (activeSubs.length > 0) {
    return res.status(400).json({
      message: `Cannot delete plan "${existingPlan.name}" because it currently has ${activeSubs.length} active subscriber(s). Please archive the plan instead.`,
      active_subscribers: activeSubs.length,
    })
  }

  await webinarService.deleteSubscriptionPlans(id)

  res.json({
    message: "Subscription plan deleted successfully",
    deleted_id: id,
  })
}
