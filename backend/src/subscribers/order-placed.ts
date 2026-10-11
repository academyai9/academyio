import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const orderService = container.resolve(Modules.ORDER)
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)

  logger.info(`Processing webinar entitlements for order: ${data.id}`)

  try {
    const order = await orderService.retrieveOrder(data.id, {
      relations: ["items", "customer"],
    })

    if (!order || !order.items || order.items.length === 0) {
      logger.warn(`Order ${data.id} has no items to process for entitlements`)
      return
    }

    const customerId = order.customer_id
    const customerEmail = order.email || (order as any).customer?.email

    if (!customerId || !customerEmail) {
      logger.warn(`Order ${data.id} lacks customer details for entitlement provisioning`)
      return
    }

    for (const item of order.items) {
      if (!item.variant_id) continue

      // Look up if this variant is mapped to a webinar
      const mappings = await webinarService.listWebinarVariantMappings({
        variant_id: item.variant_id,
      })

      if (mappings.length > 0) {
        const mapping = mappings[0]

        logger.info(
          `Granting ${mapping.option_type} entitlement for webinar ${mapping.webinar_id} to customer ${customerEmail}`
        )

        await webinarService.grantEntitlementForVariant({
          customerId,
          customerEmail,
          orderId: order.id,
          orderItemId: item.id,
          variantId: item.variant_id,
          variantTitle: item.title,
          webinarId: mapping.webinar_id,
          accessType: mapping.option_type as any,
        })
      } else if (item.metadata?.webinar_id) {
        // Fallback to item metadata if passed during cart creation
        await webinarService.grantEntitlementForVariant({
          customerId,
          customerEmail,
          orderId: order.id,
          orderItemId: item.id,
          variantId: item.variant_id,
          variantTitle: item.title,
          webinarId: item.metadata.webinar_id as string,
          accessType: (item.metadata.access_type as any) || "live",
        })
      }
    }

    logger.info(`Successfully finished provisioning entitlements for order ${data.id}`)
  } catch (error) {
    logger.error(`Error processing webinar entitlements for order ${data.id}:`, error as any)
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "payment.captured"],
}
