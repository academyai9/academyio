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

    // Provision entitlements for additional attendees if specified in checkout
    const additionalAttendeesRaw =
      (order.metadata as any)?.additional_attendees ||
      (order.metadata as any)?.additional_attendee_email
    if (additionalAttendeesRaw && typeof additionalAttendeesRaw === "string") {
      const attendeeEmails = additionalAttendeesRaw
        .split(/[,;\n]+/)
        .map((e: string) => e.trim().toLowerCase())
        .filter(
          (e: string) =>
            e.length > 3 && e.includes("@") && e !== customerEmail.toLowerCase()
        )

      if (attendeeEmails.length > 0) {
        logger.info(
          `Found ${attendeeEmails.length} additional attendee(s) for order ${data.id}: ${attendeeEmails.join(", ")}`
        )

        let customerModuleService: any = null
        try {
          customerModuleService = container.resolve(Modules.CUSTOMER)
        } catch {
          // Fallback if customer module is not resolvable
        }

        for (const attendeeEmail of attendeeEmails) {
          try {
            let attendeeCustomerId = customerId
            if (customerModuleService) {
              const existingCusts = await customerModuleService.listCustomers({
                email: attendeeEmail,
              })
              if (existingCusts && existingCusts.length > 0) {
                attendeeCustomerId = existingCusts[0].id
              } else {
                const newCust = await customerModuleService.createCustomers({
                  email: attendeeEmail,
                  first_name: "Attendee",
                  last_name: (order as any).customer?.last_name || "Guest",
                })
                attendeeCustomerId = newCust.id
              }
            }

            for (const item of order.items) {
              if (!item.variant_id) continue

              const mappings = await webinarService.listWebinarVariantMappings({
                variant_id: item.variant_id,
              })

              const targetWebinarId =
                mappings.length > 0
                  ? mappings[0].webinar_id
                  : (item.metadata?.webinar_id as string)
              const determinedAccessType =
                (mappings.length > 0
                  ? mappings[0].option_type
                  : item.metadata?.access_type) || "live"

              if (targetWebinarId) {
                logger.info(
                  `Granting additional attendee entitlement for ${attendeeEmail} on webinar ${targetWebinarId}`
                )
                await webinarService.grantEntitlementForVariant({
                  customerId: attendeeCustomerId,
                  customerEmail: attendeeEmail,
                  orderId: order.id,
                  orderItemId: `${item.id}-att-${attendeeCustomerId}`,
                  variantId: item.variant_id,
                  variantTitle: item.title,
                  webinarId: targetWebinarId,
                  accessType: determinedAccessType as any,
                })
              }
            }
          } catch (attendeeError: any) {
            logger.warn(
              `Failed to provision entitlement for additional attendee ${attendeeEmail}: ${attendeeError?.message || attendeeError}`
            )
          }
        }
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
