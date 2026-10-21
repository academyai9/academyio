import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { OrderConfirmationService } from "../modules/webinar/order-confirmation-service"

export default async function orderConfirmationEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  if (!data?.id) {
    logger.warn("[OrderConfirmationEmailSubscriber] Received event with no order ID. Skipping.")
    return
  }

  logger.info(`[OrderConfirmationEmailSubscriber] Processing order confirmation email for order: ${data.id}`)

  try {
    const result = await OrderConfirmationService.sendOrderConfirmation(data.id)

    if (result.duplicate) {
      logger.info(`[OrderConfirmationEmailSubscriber] Order ${data.id} confirmation already sent. Skipping duplicate.`)
    } else if (result.success) {
      logger.info(
        `[OrderConfirmationEmailSubscriber] Successfully sent confirmation email for order ${data.id} to ${result.recipient} via ${result.provider} (msgId: ${result.messageId})`
      )
    } else {
      logger.warn(
        `[OrderConfirmationEmailSubscriber] Email dispatch unsuccessful for order ${data.id}: ${result.error}`
      )
    }
  } catch (error: any) {
    logger.error(
      `[OrderConfirmationEmailSubscriber] Unexpected error while processing confirmation email for order ${data.id}:`,
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "payment.captured"],
}
