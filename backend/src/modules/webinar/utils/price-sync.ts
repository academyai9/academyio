import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import crypto from "crypto"

function generateId(prefix: string) {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(6).toString("hex")
  return `${prefix}_01${timestamp}${random}`.slice(0, 32)
}

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
  if (!variantId || variantId.startsWith("var_copy_")) {
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

    let priceSetId = existingPvps.rows?.[0]?.price_set_id

    if (!priceSetId) {
      // Try to create via Medusa Pricing Module
      try {
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

        if (priceSet?.id) {
          priceSetId = priceSet.id
          await remoteLink.create([
            {
              [Modules.PRODUCT]: { variant_id: variantId },
              [Modules.PRICING]: { price_set_id: priceSet.id },
            },
          ]).catch(() => {})
        }
      } catch (e) {
        // Fallback to direct DB link
      }

      if (!priceSetId) {
        priceSetId = generateId("pset")
        await pgConnection.raw(
          `INSERT INTO price_set (id, created_at, updated_at) VALUES (?, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
          [priceSetId]
        ).catch(() => {})

        const pvpsId = generateId("pvps")
        await pgConnection.raw(
          `INSERT INTO product_variant_price_set (id, variant_id, price_set_id, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [pvpsId, variantId, priceSetId]
        ).catch(() => {})
      }
    }

    if (priceSetId) {
      const currencies = Array.from(new Set([currency, "usd", "eur"]))
      for (const curr of currencies) {
        const pCheck = await pgConnection.raw(
          `SELECT id FROM price WHERE price_set_id = ? AND currency_code = ?`,
          [priceSetId, curr]
        ).catch(() => ({ rows: [] }))

        if (pCheck.rows?.length) {
          await pgConnection.raw(
            `UPDATE price SET amount = ?, raw_amount = ?::jsonb, updated_at = NOW() WHERE id = ?`,
            [amount, rawAmount, pCheck.rows[0].id]
          ).catch(() => {})
        } else {
          const priceId = generateId("price")
          await pgConnection.raw(
            `INSERT INTO price (id, price_set_id, currency_code, amount, raw_amount, rules_count, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?::jsonb, 0, NOW(), NOW())`,
            [priceId, priceSetId, curr, amount, rawAmount]
          ).catch(() => {})
        }
      }
    }
  } catch (err: any) {
    console.warn(`[price-sync] Price set update notice for ${variantId}:`, err?.message || err)
  }
}
