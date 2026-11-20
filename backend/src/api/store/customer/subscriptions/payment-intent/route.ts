import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"

/**
 * Creates a server-authoritative Stripe PaymentIntent for a Subscription Plan.
 * Amount is strictly derived from the active SubscriptionPlan record in PostgreSQL.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const customerId = (req as any).auth_context?.actor_id
  const body = (req.body as Record<string, any>) || {}

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to initiate subscription payment." })
  }

  const planId = typeof body.plan_id === "string" ? body.plan_id.trim() : ""
  if (!planId) {
    return res.status(400).json({ message: "plan_id is required." })
  }

  const [plan] = await webinarService.listSubscriptionPlans({ id: planId })
  if (!plan || plan.status !== "active") {
    return res.status(404).json({ message: "Active subscription plan not found." })
  }

  const planPrice = Number((plan as any).price || 0)
  if (planPrice <= 0) {
    return res.status(200).json({
      free_plan: true,
      client_secret: null,
      payment_intent_id: null,
      amount: 0,
      currency: "usd",
    })
  }

  const stripeSecret = process.env.STRIPE_API_KEY?.trim()
  if (!stripeSecret) {
    return res.status(503).json({
      message: "Stripe payment gateway is not configured on the server.",
    })
  }

  let customerEmail = ""
  try {
    const custRes = await pgConnection.raw(
      `SELECT email FROM customer WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      [customerId]
    )
    customerEmail = custRes.rows?.[0]?.email || ""
  } catch {
    // non-fatal
  }

  const amountInCents = Math.round(planPrice * 100)
  const currency = ((plan as any).currency_code || "usd").toLowerCase()

  try {
    const formParams = new URLSearchParams()
    formParams.append("amount", String(amountInCents))
    formParams.append("currency", currency)
    formParams.append("payment_method_types[]", "card")
    formParams.append("description", `AcademyIO Subscription: ${plan.name}`)
    formParams.append("metadata[customer_id]", customerId)
    formParams.append("metadata[plan_id]", plan.id)
    formParams.append("metadata[plan_name]", plan.name)
    if (customerEmail) {
      formParams.append("receipt_email", customerEmail)
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formParams.toString(),
    })

    const stripeData: any = await stripeRes.json()
    if (!stripeRes.ok || !stripeData?.client_secret) {
      console.error("[Subscription PaymentIntent Error]:", stripeData?.error?.message || stripeRes.status)
      return res.status(502).json({
        message: stripeData?.error?.message || "Failed to initialize Stripe payment.",
      })
    }

    return res.status(200).json({
      free_plan: false,
      client_secret: stripeData.client_secret,
      payment_intent_id: stripeData.id,
      amount: amountInCents,
      currency,
    })
  } catch (err: any) {
    console.error("[Subscription PaymentIntent Exception]:", err?.message || err)
    return res.status(502).json({
      message: "Payment gateway temporarily unavailable. Please try again.",
    })
  }
}
