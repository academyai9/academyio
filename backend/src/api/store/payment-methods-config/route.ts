import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const result = await pgConnection.raw(`
      SELECT 
        id,
        provider_id,
        name,
        display_title,
        description,
        is_active,
        environment,
        live_publishable_key,
        test_publishable_key,
        underlying_gateway,
        verification_mode,
        supported_cards,
        updated_at
      FROM payment_method_config
      WHERE is_active = true
      ORDER BY 
        CASE 
          WHEN provider_id = 'stripe' THEN 1
          WHEN provider_id = 'paypal' THEN 2
          WHEN provider_id = 'electronic_card' THEN 3
          ELSE 4 
        END ASC;
    `)

    const rows = result.rows || []

    const providerIdMapping: Record<string, string> = {
      stripe: "pp_stripe_stripe",
      paypal: "pp_paypal_paypal",
      electronic_card: "pp_system_default",
    }

    const activeMethods = rows.map((row: any) => {
      const isLive = row.environment === "live"
      const publishableKey = isLive
        ? row.live_publishable_key || ""
        : row.test_publishable_key || ""

      return {
        id: row.id,
        provider_id: row.provider_id,
        medusa_provider_id: providerIdMapping[row.provider_id] || row.provider_id,
        display_title: row.display_title,
        description: row.description,
        environment: row.environment,
        publishable_key: publishableKey,
        underlying_gateway: row.underlying_gateway,
        verification_mode: row.verification_mode,
        supported_cards: row.supported_cards || ["visa", "mastercard", "amex", "discover"],
        updated_at: row.updated_at,
      }
    })

    res.json({
      payment_methods: activeMethods,
      count: activeMethods.length,
    })
  } catch (error: any) {
    console.error("[Store Payment Methods Config Error]:", error)
    res.status(500).json({
      message: "Failed to retrieve active payment methods",
      error: error.message,
    })
  }
}
