import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)

  const plans = await webinarService.listSubscriptionPlans({}, {
    order: { order_index: "ASC" },
  })

  // Fetch count of active subscribers per plan
  const allSubscriptions = await webinarService.listCustomerSubscriptions({
    status: "active",
  })

  const enrichedPlans = plans.map((plan) => {
    const activeSubscribers = allSubscriptions.filter(
      (sub) => sub.plan_id === plan.id
    ).length

    return {
      ...plan,
      active_subscribers_count: activeSubscribers,
    }
  })

  res.json({
    plans: enrichedPlans,
    count: enrichedPlans.length,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const body = req.body as Record<string, any>

  if (!body.name) {
    return res.status(400).json({ message: "Plan name is required" })
  }

  const slug =
    body.slug ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

  const plan = await (webinarService.createSubscriptionPlans as any)({
    name: body.name,
    slug,
    description: body.description || null,
    price: body.price !== undefined ? parseFloat(body.price) : 99,
    currency_code: body.currency_code || "usd",
    billing_interval: body.billing_interval || "monthly",
    webinar_access_limit:
      body.webinar_access_limit !== undefined && body.webinar_access_limit !== null
        ? parseInt(body.webinar_access_limit)
        : null,
    includes_live: body.includes_live !== undefined ? Boolean(body.includes_live) : true,
    includes_recording:
      body.includes_recording !== undefined ? Boolean(body.includes_recording) : true,
    includes_transcript:
      body.includes_transcript !== undefined ? Boolean(body.includes_transcript) : true,
    includes_pdf: body.includes_pdf !== undefined ? Boolean(body.includes_pdf) : true,
    status: body.status || "active",
    benefits: Array.isArray(body.benefits)
      ? body.benefits
      : typeof body.benefits === "string"
      ? body.benefits.split("\n").filter(Boolean)
      : [],
    order_index: body.order_index !== undefined ? parseInt(body.order_index) : 0,
    metadata: body.metadata || null,
  })

  res.status(201).json({
    message: "Subscription plan created successfully",
    plan,
  })
}
