import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"

export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const orderService = container.resolve(Modules.ORDER)
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const rawId = event.data?.id
  if (!rawId) return

  let orderId: string | null = rawId

  // In Medusa v2, payment.captured emits a payment ID (pay_...), not an order ID.
  if (event.name === "payment.captured" || rawId.startsWith("pay_")) {
    try {
      const res = await pgConnection.raw(
        `
        SELECT opc.order_id
        FROM payment p
        JOIN order_payment_collection opc ON opc.payment_collection_id = p.payment_collection_id
        WHERE p.id = ?
        LIMIT 1
        `,
        [rawId]
      )
      orderId = res.rows?.[0]?.order_id || null
    } catch (err: any) {
      logger.warn(`[OrderPlaced] Could not resolve order for payment ${rawId}: ${err?.message || err}`)
      return
    }
  }

  if (!orderId) {
    logger.warn(`[OrderPlaced] No order ID resolved for event ${event.name} (${rawId})`)
    return
  }

  logger.info(`Processing webinar entitlements for order: ${orderId}`)

  try {
    const order = await orderService.retrieveOrder(orderId, {
      relations: ["items", "customer"],
    })

    if (!order || !order.items || order.items.length === 0) {
      logger.warn(`Order ${orderId} has no items to process for entitlements`)
      return
    }

    if ((order as any).status === "canceled") {
      logger.warn(`Order ${orderId} is canceled; skipping entitlement provisioning`)
      return
    }

    const customerId = order.customer_id
    const customerEmail = order.email || (order as any).customer?.email

    if (!customerId || !customerEmail) {
      logger.warn(`Order ${orderId} lacks customer details for entitlement provisioning`)
      return
    }

    for (const item of order.items) {
      if (!item.variant_id) continue

      // Strictly look up trusted DB variant mapping — NEVER trust user-controllable item.metadata.webinar_id
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
      }
    }

    // Provision entitlements for additional attendees strictly bounded by purchased extra seats (quantity - 1)
    const additionalAttendeesRaw =
      (order.metadata as any)?.additional_attendees ||
      (order.metadata as any)?.additional_attendee_email
    if (additionalAttendeesRaw && typeof additionalAttendeesRaw === "string") {
      const attendeeEmails = Array.from(
        new Set(
          additionalAttendeesRaw
            .split(/[,;\n]+/)
            .map((e: string) => e.trim().toLowerCase())
            .filter(
              (e: string) =>
                e.length > 3 && e.includes("@") && e !== customerEmail.toLowerCase()
            )
        )
      )

      if (attendeeEmails.length > 0) {
        let customerModuleService: any = null
        try {
          customerModuleService = container.resolve(Modules.CUSTOMER)
        } catch {
          // Fallback if customer module is not resolvable
        }

        for (const item of order.items) {
          if (!item.variant_id) continue

          // Enforce seat limit: only grant additional attendees up to (item.quantity - 1) extra paid seats
          const extraPaidSeats = Math.max(0, Number(item.quantity || 1) - 1)
          if (extraPaidSeats === 0) continue

          const mappings = await webinarService.listWebinarVariantMappings({
            variant_id: item.variant_id,
          })
          if (mappings.length === 0) continue

          const mapping = mappings[0]
          const eligibleAttendees = attendeeEmails.slice(0, extraPaidSeats)

          for (const attendeeEmail of eligibleAttendees) {
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

              logger.info(
                `Granting paid extra-seat entitlement for ${attendeeEmail} on webinar ${mapping.webinar_id}`
              )
              await webinarService.grantEntitlementForVariant({
                customerId: attendeeCustomerId,
                customerEmail: attendeeEmail,
                orderId: order.id,
                orderItemId: `${item.id}-att-${attendeeCustomerId}`,
                variantId: item.variant_id,
                variantTitle: item.title,
                webinarId: mapping.webinar_id,
                accessType: mapping.option_type as any,
              })
            } catch (attendeeError: any) {
              logger.warn(
                `Failed to provision entitlement for additional attendee ${attendeeEmail}: ${attendeeError?.message || attendeeError}`
              )
            }
          }
        }
      }
    }

    logger.info(`Successfully finished provisioning entitlements for order ${orderId}`)
  } catch (error) {
    logger.error(`Error processing webinar entitlements for order ${orderId}:`, error as any)
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "payment.captured"],
}
