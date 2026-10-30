import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const force = req.query.force === "true" || req.query.force === "1"

    const [existingPlan] = await webinarService.listSubscriptionPlans({ id })
    if (!existingPlan) {
      return res.status(404).json({ message: "Subscription plan not found" })
    }

    // Check active subscribers
    const activeSubs = await webinarService.listCustomerSubscriptions({
      plan_id: id,
      status: "active",
    })

    if (activeSubs.length > 0 && !force) {
      return res.status(400).json({
        message: `Plan "${existingPlan.name}" currently has ${activeSubs.length} active subscriber(s). Please confirm force deletion if you want to proceed.`,
        active_subscribers: activeSubs.length,
        requires_force: true,
      })
    }

    // Ensure plan_id is nullable in case of older schema versions
    await pgConnection.raw(
      `ALTER TABLE customer_subscription ALTER COLUMN plan_id DROP NOT NULL;`
    ).catch(() => {})

    // Unlink any customer subscriptions referencing this plan so history is preserved without FK errors
    await pgConnection.raw(
      `UPDATE customer_subscription SET plan_id = NULL WHERE plan_id = ?`,
      [id]
    ).catch(() => {})

    // Delete the subscription plan record
    await pgConnection.raw(`DELETE FROM subscription_plan WHERE id = ?`, [id])

    return res.json({
      message: `Subscription plan "${existingPlan.name}" deleted successfully`,
      deleted_id: id,
      unlinked_subscribers: activeSubs.length,
    })
  } catch (error: any) {
    console.error("[Delete Subscription Plan Error]:", error)
    return res.status(500).json({
      message: error.message || "Failed to delete subscription plan",
    })
  }
}
