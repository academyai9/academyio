import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OrderConfirmationService } from "../modules/webinar/order-confirmation-service"

export default async function orderConfirmationEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const rawId = event.data?.id

  if (!rawId) {
    logger.warn("[OrderConfirmationEmailSubscriber] Received event with no ID. Skipping.")
    return
  }

  let orderId: string | null = rawId

  // Resolve order_id when triggered by payment.captured (which emits a payment ID)
  if (event.name === "payment.captured" || rawId.startsWith("pay_")) {
    try {
      const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
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
      logger.warn(
        `[OrderConfirmationEmailSubscriber] Could not resolve order for payment ${rawId}: ${err?.message || err}`
      )
      return
    }
  }

  if (!orderId) return

  logger.info(`[OrderConfirmationEmailSubscriber] Processing order confirmation email for order: ${orderId}`)

  try {
    const result = await OrderConfirmationService.sendOrderConfirmation(orderId)

    if (result.duplicate) {
      logger.info(`[OrderConfirmationEmailSubscriber] Order ${orderId} confirmation already sent. Skipping duplicate.`)
    } else if (result.success) {
      logger.info(
        `[OrderConfirmationEmailSubscriber] Successfully sent confirmation email for order ${orderId} to ${result.recipient} via ${result.provider} (msgId: ${result.messageId})`
      )
    } else {
      logger.warn(
        `[OrderConfirmationEmailSubscriber] Email dispatch unsuccessful for order ${orderId}: ${result.error}`
      )
    }
  } catch (error: any) {
    logger.error(
      `[OrderConfirmationEmailSubscriber] Unexpected error while processing confirmation email for order ${orderId}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "payment.captured"],
}
