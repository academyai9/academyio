import { MedusaService } from "@medusajs/framework/utils"
import { Webinar } from "./models/webinar"
import { WebinarResource } from "./models/webinar-resource"
import { CustomerEntitlement } from "./models/customer-entitlement"
import { WebinarVariantMapping } from "./models/webinar-variant-mapping"

class WebinarModuleService extends MedusaService({
  Webinar,
  WebinarResource,
  CustomerEntitlement,
  WebinarVariantMapping,
}) {
  /**
   * Check if a customer has verified, active entitlement for a webinar and access type
   */
  async checkCustomerAccess(
    customerId: string,
    webinarId: string,
    accessType: "live" | "recording" | "transcript" | "pdf"
  ): Promise<boolean> {
    const entitlements = await this.listCustomerEntitlements({
      customer_id: customerId,
      webinar: { id: webinarId },
      status: "active",
    })

    if (!entitlements || entitlements.length === 0) {
      return false
    }

    const now = new Date()

    return entitlements.some((ent) => {
      // Check expiration if set
      if (ent.expires_at && new Date(ent.expires_at) < now) {
        return false
      }

      // If bundle, grants all access types
      if (ent.access_type === "bundle") {
        return true
      }

      return ent.access_type === accessType
    })
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
    const determinedAccessType = mapping ? mapping.option_type : (data.accessType || "live")

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
