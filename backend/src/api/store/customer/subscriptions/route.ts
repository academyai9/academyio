import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  let customerId = (req as any).auth_context?.actor_id || (req.query.customer_id as string)
  const customerEmail = req.query.customer_email as string

  // If customerId is not found, try to resolve by customerEmail
  if (!customerId && customerEmail) {
    try {
      const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const custRes = await pgConnection.raw(
        `SELECT id FROM customer WHERE email = ? LIMIT 1;`,
        [customerEmail]
      )
      if (custRes.rows?.[0]) {
        customerId = custRes.rows[0].id
      }
    } catch (e) {
      // ignore
    }
  }

  if (!customerId && !customerEmail) {
    return res.status(401).json({ message: "Authentication required" })
  }

  // Find most recent subscription for this customer
  const filters: Record<string, any> = {}
  if (customerId) {
    filters.customer_id = customerId
  }

  let subs = await webinarService.listCustomerSubscriptions(
    filters,
    { order: { current_period_end: "DESC" } }
  )

  // If not found by customer_id and customerEmail was provided, try by email
  if ((!subs || subs.length === 0) && customerEmail) {
    subs = await webinarService.listCustomerSubscriptions(
      { customer_email: customerEmail },
      { order: { current_period_end: "DESC" } }
    )
  }

  if (!subs || subs.length === 0) {
    return res.json({
      has_subscription: false,
      subscription: null,
      plan: null,
    })
  }

  const latestSub = subs[0]
  const [plan] = await webinarService.listSubscriptionPlans({ id: latestSub.plan_id })

  const now = new Date()
  const isActive = latestSub.status === "active" && new Date(latestSub.current_period_end) > now

  res.json({
    has_subscription: isActive,
    subscription: {
      id: latestSub.id,
      customer_id: latestSub.customer_id,
      customer_email: latestSub.customer_email,
      plan_id: latestSub.plan_id,
      plan_name: latestSub.plan_name,
      status: latestSub.status,
      current_period_start: latestSub.current_period_start,
      current_period_end: latestSub.current_period_end,
      cancel_at_period_end: latestSub.cancel_at_period_end,
      canceled_at: latestSub.canceled_at,
      payment_provider_id: latestSub.payment_provider_id,
      payment_method_summary: latestSub.payment_method_summary,
      monthly_access_used: latestSub.monthly_access_used,
      metadata: latestSub.metadata,
      is_active: isActive,
    },
    plan: plan || null,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = req.body as Record<string, any>

  let customerId = (req as any).auth_context?.actor_id || body.customer_id
  let customerEmail = body.customer_email

  // Resolve customer details from DB if customerId exists
  if (customerId) {
    try {
      const custRes = await pgConnection.raw(
        `SELECT id, email, first_name, last_name FROM customer WHERE id = ? LIMIT 1;`,
        [customerId]
      )
      if (custRes.rows?.[0]) {
        if (!customerEmail) {
          customerEmail = custRes.rows[0].email
        }
      }
    } catch (e) {
      console.warn("Could not lookup customer by id:", e)
    }
  } else if (customerEmail) {
    try {
      const custRes = await pgConnection.raw(
        `SELECT id, email, first_name, last_name FROM customer WHERE email = ? LIMIT 1;`,
        [customerEmail]
      )
      if (custRes.rows?.[0]) {
        customerId = custRes.rows[0].id
      } else {
        customerId = `cus_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
      }
    } catch (e) {
      customerId = `cus_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    }
  }

  if (!customerId && !customerEmail) {
    return res.status(401).json({ message: "Authentication required to subscribe" })
  }

  if (!customerEmail) {
    customerEmail = "customer@academyio.com"
  }

  const planId = body.plan_id
  if (!planId) {
    return res.status(400).json({ message: "plan_id is required" })
  }

  const [plan] = await webinarService.listSubscriptionPlans({ id: planId })
  if (!plan) {
    return res.status(404).json({ message: "Subscription plan not found" })
  }

  if (plan.status !== "active") {
    return res.status(400).json({ message: "Selected plan is not currently available" })
  }

  // Cancel any existing active subscription for this customer
  const existingSubs = await webinarService.listCustomerSubscriptions({
    customer_id: customerId,
    status: "active",
  })

  for (const existing of existingSubs) {
    await webinarService.updateCustomerSubscriptions({
      id: existing.id,
      status: "canceled",
      canceled_at: new Date(),
    })
  }

  // Period end calculation based on interval
  const now = new Date()
  const periodEnd = new Date(now)
  if (plan.billing_interval === "annual" || plan.billing_interval === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else if (plan.billing_interval === "quarterly") {
    periodEnd.setMonth(periodEnd.getMonth() + 3)
  } else {
    periodEnd.setDate(periodEnd.getDate() + 30)
  }

  const paymentProvider = body.payment_provider_id || "stripe"
  let paymentMethod = body.payment_method
  if (!paymentMethod) {
    if (paymentProvider === "paypal") {
      paymentMethod = `PayPal Express (${customerEmail})`
    } else if (paymentProvider === "electronic_card") {
      paymentMethod = `Electronic Card [Instant Verified] (${body.card_brand || "Visa"} ending in ${body.last4 || "4242"})`
    } else {
      paymentMethod = `Stripe (${body.card_brand || "Visa"} ending in ${body.last4 || "4242"})`
    }
  }

  const metadata = {
    gateway: paymentProvider,
    verification_status: "verified",
    verification_mode: body.verification_mode || (paymentProvider === "electronic_card" ? "instant_verification" : "standard"),
    card_brand: body.card_brand || null,
    last4: body.last4 || null,
    cardholder_name: body.cardholder_name || null,
    auth_code: `AUTH_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    verified_at: new Date().toISOString(),
    ...(body.metadata || {}),
  }

  const newSub = await webinarService.createCustomerSubscriptions({
    customer_id: customerId,
    customer_email: customerEmail,
    plan_id: plan.id,
    plan_name: plan.name,
    status: "active",
    current_period_start: now,
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    payment_provider_id: paymentProvider,
    payment_method_summary: paymentMethod,
    monthly_access_used: 0,
    metadata,
  })

  res.status(201).json({
    message: `Successfully subscribed to ${plan.name}`,
    subscription: newSub,
    plan,
  })
}
