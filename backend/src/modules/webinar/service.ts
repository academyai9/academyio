import { MedusaService } from "@medusajs/framework/utils"
import { Webinar } from "./models/webinar"
import { WebinarResource } from "./models/webinar-resource"
import { CustomerEntitlement } from "./models/customer-entitlement"
import { WebinarVariantMapping } from "./models/webinar-variant-mapping"
import { Speaker } from "./models/speaker"
import { SubscriptionPlan } from "./models/subscription-plan"
import { CustomerSubscription } from "./models/customer-subscription"
import { WebinarQuiz } from "./models/webinar-quiz"
import { QuizQuestion } from "./models/quiz-question"
import { QuizAttempt } from "./models/quiz-attempt"
import { WebinarCertificate } from "./models/webinar-certificate"

class WebinarModuleService extends MedusaService({
  Webinar,
  WebinarResource,
  CustomerEntitlement,
  WebinarVariantMapping,
  Speaker,
  SubscriptionPlan,
  CustomerSubscription,
  WebinarQuiz,
  QuizQuestion,
  QuizAttempt,
  WebinarCertificate,
}) {
  /**
   * Check if a customer has verified, active access (via direct purchase OR active monthly subscription)
   */
  async checkCustomerAccess(
    customerId: string,
    webinarId: string,
    accessType: "live" | "recording" | "transcript" | "pdf"
  ): Promise<boolean> {
    const now = new Date()

    // 1. Check direct customer entitlements
    const entitlements = await this.listCustomerEntitlements({
      customer_id: customerId,
      webinar: { id: webinarId },
      status: "active",
    })

    if (entitlements && entitlements.length > 0) {
      const hasDirectAccess = entitlements.some((ent) => {
        if (ent.expires_at && new Date(ent.expires_at) < now) {
          return false
        }
        if (ent.access_type === "bundle") {
          return true
        }
        return ent.access_type === accessType
      })
      if (hasDirectAccess) {
        return true
      }
    }

    // 2. Check active monthly subscription
    const subscriptions = await this.listCustomerSubscriptions({
      customer_id: customerId,
      status: "active",
    })

    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        if (new Date(sub.current_period_end) > now) {
          const [plan] = await this.listSubscriptionPlans({ id: sub.plan_id })
          if (plan && plan.status === "active") {
            if (accessType === "live" && plan.includes_live) return true
            if (accessType === "recording" && plan.includes_recording) return true
            if (accessType === "transcript" && plan.includes_transcript) return true
            if (accessType === "pdf" && plan.includes_pdf) return true
          }
        }
      }
    }

    return false
  }

  /**
   * Provision entitlement for an order item
   */
  async grantEntitlementForVariant(data: {
    customerId: string
    customerEmail: string
    orderId: string
    orderItemId: string
    variantId: string
    variantTitle?: string
    webinarId?: string
    accessType?: "live" | "recording" | "transcript" | "pdf" | "bundle"
  }) {
    // Check if mapping exists
    const [mapping] = await this.listWebinarVariantMappings({
      variant_id: data.variantId,
    })

    const targetWebinarId = mapping ? mapping.webinar_id : data.webinarId
    const determinedAccessType = mapping ? (mapping.option_type as any) : (data.accessType || "live")

    if (!targetWebinarId) {
      throw new Error(`No associated webinar found for variant ${data.variantId}`)
    }

    // Check for existing active entitlement to prevent duplicate webhooks granting multiple times
    const existing = await this.listCustomerEntitlements({
      customer_id: data.customerId,
      order_id: data.orderId,
      variant_id: data.variantId,
    })

    if (existing.length > 0) {
      return existing[0]
    }

    return await this.createCustomerEntitlements({
      customer_id: data.customerId,
      customer_email: data.customerEmail,
      order_id: data.orderId,
      order_item_id: data.orderItemId,
      variant_id: data.variantId,
      variant_title: data.variantTitle || "",
      access_type: determinedAccessType,
      status: "active",
      granted_at: new Date(),
      webinar_id: targetWebinarId,
    })
  }
}

export default WebinarModuleService
