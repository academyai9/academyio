import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"

export default async function seedMedusaOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)

  logger.info("Seeding realistic Medusa Orders for Webinar purchases...")

  // Find demo customer
  const [customers] = await customerModule.listAndCountCustomers({ email: "customer@academyio.com" })
  const customer = customers.length ? customers[0] : null
  if (!customer) {
    logger.warn("Customer customer@academyio.com not found, skipping order seeding")
    return
  }

  // Check if orders already exist
  const existingOrders = await orderModule.listOrders({ customer_id: customer.id })
  if (existingOrders && existingOrders.length > 0) {
    logger.info(`Orders already exist for customer: ${existingOrders.length}`)
    return
  }

  // Create Order 1: S Corp Basis Complete Package ($249)
  const order1 = await orderModule.createOrders({
    customer_id: customer.id,
    email: customer.email,
    currency_code: "usd",
    status: "completed",
    items: [
      {
        title: "S Corp Basis Analysis - Complete Package (Live + Recording + Transcript + PDF)",
        subtitle: "Complete Package: Live + Recording + Transcript + PDF",
        quantity: 1,
        unit_price: 249,
        product_id: "prod_01M4N9A6M6JXS99WEQ81XWRH8T",
        variant_id: "variant_01M4N9A6M6MK5ZP7B66YGWVZS8",
        variant_sku: "WEB-9GWZXD-BND",
      },
    ],
    transactions: [
      {
        amount: 249,
        currency_code: "usd",
      },
    ],
    metadata: {
      webinar_order: true,
      webinar_slug: "s-corp-basis-analysis-form-7203",
    },
  })

  // Create Order 2: GAAP 2026 Standards Update ($178)
  const order2 = await orderModule.createOrders({
    customer_id: customer.id,
    email: customer.email,
    currency_code: "usd",
    status: "completed",
    items: [
      {
        title: "GAAP Accounting Standards Update 2026 - Recorded Webinar & PDF Handouts",
        subtitle: "Recorded Webinar + PDF Download",
        quantity: 1,
        unit_price: 178,
        product_id: "prod_01M4N9A6PXK8QX4D9XVHXTZYTW",
        variant_id: "variant_01M4N9A6PXQCZ8XB688JR66Q6W",
        variant_sku: "WEB-BD2M8B-REC",
      },
    ],
    transactions: [
      {
        amount: 178,
        currency_code: "usd",
      },
    ],
    metadata: {
      webinar_order: true,
      webinar_slug: "gaap-accounting-standards-update-2026",
    },
  })

  logger.info(`Seeded 2 Medusa Orders: ${order1.id}, ${order2.id}`)

  // Link customer entitlements to the real order IDs
  const entitlements = await webinarService.listCustomerEntitlements({ customer_id: customer.id })
  for (const ent of entitlements) {
    if (ent.access_type === "bundle" || ent.variant_title?.includes("Complete Package")) {
      await webinarService.updateCustomerEntitlements({ id: ent.id, order_id: order1.id })
    } else {
      await webinarService.updateCustomerEntitlements({ id: ent.id, order_id: order2.id })
    }
  }

  logger.info("Successfully linked webinar entitlements to real Medusa order IDs!")
}
