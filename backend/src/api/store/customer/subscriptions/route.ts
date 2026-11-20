import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const customerId = (req as any).auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const subs = await webinarService.listCustomerSubscriptions(
    { customer_id: customerId },
    { order: { current_period_end: "DESC" } }
  )

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
  const body = (req.body as Record<string, any>) || {}

  // Strictly require verified authenticated customer — never trust body.customer_id or body.customer_email
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to subscribe" })
  }

  let customerEmail: string | null = null
  try {
    const custRes = await pgConnection.raw(
      `SELECT id, email FROM customer WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      [customerId]
    )
    customerEmail = custRes.rows?.[0]?.email || null
  } catch (e) {
    console.warn("Could not lookup authenticated customer:", e)
  }

  if (!customerEmail) {
    return res.status(401).json({ message: "Authenticated customer account not found" })
  }

  const planId = body.plan_id
  if (!planId || typeof planId !== "string") {
    return res.status(400).json({ message: "plan_id is required" })
  }

  const [plan] = await webinarService.listSubscriptionPlans({ id: planId })
  if (!plan) {
    return res.status(404).json({ message: "Subscription plan not found" })
  }

  if (plan.status !== "active") {
    return res.status(400).json({ message: "Selected plan is not currently available" })
  }

  // Server-side Payment Verification for all paid plans (NEVER grant free subscription on client assertion)
  const planPrice = Number((plan as any).price || 0)
  const paymentIntentId = typeof body.payment_intent_id === "string" ? body.payment_intent_id.trim() : ""
  let verifiedPaymentRef: string | null = null

  if (planPrice > 0) {
    if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
      return res.status(402).json({
        message: "Verified Stripe payment_intent_id is required to activate a paid subscription.",
      })
    }

    const stripeSecret = process.env.STRIPE_API_KEY?.trim()
    if (!stripeSecret) {
      return res.status(503).json({
        message: "Payment verification gateway is not configured.",
      })
    }

    // Prevent replay of a previously used PaymentIntent
    const existingByPi = await pgConnection
      .raw(
        `SELECT id FROM customer_subscription WHERE metadata->>'payment_intent_id' = ? LIMIT 1;`,
        [paymentIntentId]
      )
      .catch(() => ({ rows: [] }))
    if (existingByPi.rows && existingByPi.rows.length > 0) {
      return res.status(409).json({
        message: "This payment has already been applied to a subscription.",
      })
    }

    try {
      const piRes = await fetch(
        `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${stripeSecret}`,
          },
        }
      )
      if (!piRes.ok) {
        return res.status(402).json({
          message: "Unable to verify payment with Stripe. Subscription was not activated.",
        })
      }
      const piData: any = await piRes.json()
      const expectedCents = Math.round(planPrice * 100)
      if (piData.status !== "succeeded" || Number(piData.amount_received || 0) < expectedCents) {
        return res.status(402).json({
          message: "Payment has not succeeded or amount does not match the selected plan.",
        })
      }
      verifiedPaymentRef = piData.id
    } catch (stripeErr: any) {
      console.error("[Subscription Payment Verification Error]:", stripeErr?.message || stripeErr)
      return res.status(502).json({
        message: "Payment verification service temporarily unavailable.",
      })
    }
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
  const paymentMethod =
    body.payment_method ||
    `Stripe (${body.card_brand || "Card"}${body.last4 ? ` ending in ${String(body.last4).slice(-4)}` : ""})`

  const metadata = {
    gateway: paymentProvider,
    verification_status: "stripe_verified",
    payment_intent_id: verifiedPaymentRef,
    verified_at: new Date().toISOString(),
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
