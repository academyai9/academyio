import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Ensures a product variant has a linked Price Set in the Medusa v2 Pricing module
 * with USD and EUR currency prices. Also updates existing prices if already linked.
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

  const currency = (currencyCode || "usd").toLowerCase()
  const amount = Number(priceAmount) || 149
  const rawAmount = JSON.stringify({ value: String(amount), precision: 20 })

  try {
    const pgConnection = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Check if price set already exists for this variant
    const existingPvps = await pgConnection.raw(
      `SELECT price_set_id FROM product_variant_price_set WHERE variant_id = ?`,
      [variantId]
    ).catch(() => ({ rows: [] }))

    if (existingPvps.rows?.length && existingPvps.rows[0].price_set_id) {
      const priceSetId = existingPvps.rows[0].price_set_id
      // Update USD price
      await pgConnection.raw(
        `UPDATE price SET amount = ?, raw_amount = ?::jsonb, updated_at = NOW() WHERE price_set_id = ? AND currency_code = ?`,
        [amount, rawAmount, priceSetId, currency]
      ).catch(() => {})
      // Update EUR price
      await pgConnection.raw(
        `UPDATE price SET amount = ?, raw_amount = ?::jsonb, updated_at = NOW() WHERE price_set_id = ? AND currency_code = 'eur'`,
        [amount, rawAmount, priceSetId]
      ).catch(() => {})
      return
    }

    // Otherwise create via Medusa Pricing Module
    const pricingModule = scope.resolve(Modules.PRICING)
    const remoteLink = scope.resolve(ContainerRegistrationKeys.LINK)

    const [priceSet] = await pricingModule.createPriceSets([
      {
        prices: [
          { amount, currency_code: currency },
          { amount, currency_code: "eur" },
        ],
      },
    ])

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
    console.warn(`[price-sync] Price set update notice for ${variantId}:`, err?.message || err)
  }
}
