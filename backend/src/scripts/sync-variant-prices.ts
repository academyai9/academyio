import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { WEBINAR_MODULE } from "../modules/webinar"
import WebinarModuleService from "../modules/webinar/service"

export default async function syncVariantPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)
  const pricingModule = container.resolve(Modules.PRICING)
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
  const webinarService: WebinarModuleService = container.resolve(WEBINAR_MODULE)

  logger.info("Starting sync of Webinar Variant Prices with Pricing Module...")

  const mappings = await webinarService.listWebinarVariantMappings({})
  logger.info(`Found ${mappings.length} webinar variant mappings to process.`)

  let linkedCount = 0
  let skippedCount = 0

  for (const mapping of mappings) {
    if (!mapping.variant_id) continue

    try {
      const [variant] = await productModule.listProductVariants({ id: mapping.variant_id })
      if (!variant) {
        continue
      }

      const priceAmount = Number(mapping.price) || 149
      const currency = (mapping.currency_code || "usd").toLowerCase()

      // Create price set
      const [priceSet] = await pricingModule.createPriceSets([
        {
          prices: [
            {
              amount: priceAmount,
              currency_code: currency,
            },
            {
              amount: priceAmount,
              currency_code: "eur",
            },
          ],
        },
      ])

      // Link variant to price set
      await remoteLink.create([
        {
          [Modules.PRODUCT]: {
            variant_id: mapping.variant_id,
          },
          [Modules.PRICING]: {
            price_set_id: priceSet.id,
          },
        },
      ])

      logger.info(`Successfully linked price set ${priceSet.id} ($${priceAmount} ${currency}) to variant ${mapping.variant_id} (${mapping.title})`)
      linkedCount++
    } catch (err: any) {
      logger.error(`Error linking variant ${mapping.variant_id}: ${err.message}`)
    }
  }

  logger.info(`Price sync complete! Newly linked: ${linkedCount}, Skipped: ${skippedCount}`)
}
