import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)

  const plans = await webinarService.listSubscriptionPlans(
    { status: "active" },
    { order: { order_index: "ASC" } }
  )

  res.json({
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price: plan.price,
      currency_code: plan.currency_code,
      billing_interval: plan.billing_interval,
      webinar_access_limit: plan.webinar_access_limit,
      includes_live: plan.includes_live,
      includes_recording: plan.includes_recording,
      includes_transcript: plan.includes_transcript,
      includes_pdf: plan.includes_pdf,
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
      order_index: plan.order_index,
    })),
    count: plans.length,
  })
}
