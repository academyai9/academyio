import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Ensures a product variant has a linked Price Set in the Medusa v2 Pricing module
 * with USD and EUR currency prices.
 */
export async function ensureVariantPriceSet(
  scope: any,
  variantId: string,
  priceAmount: number,
  currencyCode: string = "usd"
): Promise<void> {
  if (!variantId || variantId.startsWith("var_custom_") || variantId.startsWith("var_copy_")) {
    return
  }

  try {
    const pricingModule = scope.resolve(Modules.PRICING)
    const remoteLink = scope.resolve(ContainerRegistrationKeys.LINK)
    const currency = (currencyCode || "usd").toLowerCase()
    const amount = Number(priceAmount) || 149

    // Create price set with prices for both store currencies
    const [priceSet] = await pricingModule.createPriceSets([
      {
        prices: [
          { amount, currency_code: currency },
          { amount, currency_code: "eur" },
        ],
      },
    ])

    // Link variant to price set via Medusa remoteLink
    await remoteLink.create([
      {
        [Modules.PRODUCT]: {
          variant_id: variantId,
        },
        [Modules.PRICING]: {
          price_set_id: priceSet.id,
        },
      },
    ])
  } catch (err: any) {
    // If price set is already linked or error occurs, log warning
    console.warn(`[price-sync] Price set link notice for ${variantId}:`, err?.message || err)
  }
}
