import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { status, customer_id, search } = req.query as Record<string, string>

  const filters: Record<string, any> = {}
  if (status && status !== "all") filters.status = status
  if (customer_id && customer_id !== "all") filters.customer_id = customer_id

  let subscriptions = await webinarService.listCustomerSubscriptions(filters)

  // Search filter if provided
  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    subscriptions = subscriptions.filter(
      (s: any) =>
        s.customer_email?.toLowerCase().includes(q) ||
        s.customer_id?.toLowerCase().includes(q) ||
        s.plan_name?.toLowerCase().includes(q)
    )
  }

  // Enrich with plan details
  const plans = await webinarService.listSubscriptionPlans({})
  const planMap = new Map(plans.map((p) => [p.id, p]))

  const enriched = subscriptions.map((sub: any) => ({
    ...sub,
    plan: (sub.plan_id ? planMap.get(sub.plan_id) : null) || null,
  }))

  // Also fetch customer list for dropdown
  const customersRes = await pgConnection.raw(`
    SELECT id, email, first_name, last_name
    FROM customer
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 100
  `)

  res.json({
    subscriptions: enriched,
    count: enriched.length,
    plans,
    customers: customersRes.rows || [],
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body as Record<string, any>

  let customerId = body.customer_id
  let customerEmail = (body.customer_email || "").trim()

  // Auto-resolve customer by email if customer_id not supplied directly
  if (!customerId && customerEmail) {
    const custRes = await pgConnection.raw(
      "SELECT id, email FROM customer WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL LIMIT 1",
      [customerEmail]
    )
    if (custRes.rows && custRes.rows.length > 0) {
      customerId = custRes.rows[0].id
      customerEmail = custRes.rows[0].email
    } else {
      customerId = `cus_${crypto.randomBytes(12).toString("hex")}`
    }
  }

  if (!customerId || !body.plan_id) {
    return res.status(400).json({ message: "Customer email/ID and plan_id are required" })
  }

  const [plan] = await webinarService.listSubscriptionPlans({ id: body.plan_id })
  if (!plan) {
    return res.status(404).json({ message: "Subscription plan not found" })
  }

  const durationDays = parseInt(body.duration_days, 10) || 30
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setDate(periodEnd.getDate() + durationDays)

  const subscription = await webinarService.createCustomerSubscriptions({
    customer_id: customerId,
    customer_email: customerEmail || "customer@academyio.com",
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
