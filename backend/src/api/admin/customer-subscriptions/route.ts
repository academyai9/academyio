import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { status, customer_id } = req.query as Record<string, string>

  const filters: Record<string, any> = {}
  if (status) filters.status = status
  if (customer_id) filters.customer_id = customer_id

  const subscriptions = await webinarService.listCustomerSubscriptions(filters)

  // Enrich with plan details
  const plans = await webinarService.listSubscriptionPlans({})
  const planMap = new Map(plans.map((p) => [p.id, p]))

  const enriched = subscriptions.map((sub: any) => ({
    ...sub,
    plan: (sub.plan_id ? planMap.get(sub.plan_id) : null) || null,
  }))

  res.json({
    subscriptions: enriched,
    count: enriched.length,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const body = req.body as Record<string, any>

  if (!body.customer_id || !body.plan_id) {
    return res.status(400).json({ message: "customer_id and plan_id are required" })
  }

  const [plan] = await webinarService.listSubscriptionPlans({ id: body.plan_id })
  if (!plan) {
    return res.status(404).json({ message: "Subscription plan not found" })
  }

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setDate(periodEnd.getDate() + 30)

  const subscription = await webinarService.createCustomerSubscriptions({
    customer_id: body.customer_id,
    customer_email: body.customer_email || "customer@academyio.com",
    plan_id: plan.id,
    plan_name: plan.name,
    status: body.status || "active",
    current_period_start: now,
    current_period_end: body.current_period_end ? new Date(body.current_period_end) : periodEnd,
    cancel_at_period_end: false,
    payment_provider_id: body.payment_provider_id || "admin_manual",
    payment_method_summary: body.payment_method_summary || "Manual Administrator Grant",
    monthly_access_used: 0,
  })

  res.status(201).json({
    message: "Customer subscription created successfully",
    subscription,
  })
}
