import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"

/**
 * Automatically revokes webinar entitlements when an order is canceled or payment is refunded.
 */
export default async function orderCanceledOrRefundedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const rawId = event.data?.id
  if (!rawId) return

  let orderId: string | null = rawId

  // If triggered by payment.refunded, resolve the linked order_id from payment_id
  if (event.name === "payment.refunded" || rawId.startsWith("pay_")) {
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
      logger.warn(`[OrderRevocation] Could not resolve order for payment ${rawId}: ${err?.message || err}`)
      return
    }
  }

  if (!orderId) return

  try {
    const activeEntitlements = await webinarService.listCustomerEntitlements({
      order_id: orderId,
      status: "active",
    })

    if (!activeEntitlements || activeEntitlements.length === 0) {
      return
    }

    const reason = event.name === "payment.refunded" ? "refunded" : "canceled"
    for (const ent of activeEntitlements) {
      await webinarService.updateCustomerEntitlements({
        id: ent.id,
        status: "revoked",
        metadata: {
          ...((ent.metadata as Record<string, any>) || {}),
          revoked_at: new Date().toISOString(),
          revocation_reason: reason,
        },
      } as any)
    }

    logger.info(
      `[OrderRevocation] Revoked ${activeEntitlements.length} entitlement(s) for ${reason} order ${orderId}`
    )
  } catch (error: any) {
    logger.error(
      `[OrderRevocation] Failed to revoke entitlements for order ${orderId}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: ["order.canceled", "payment.refunded"],
}
