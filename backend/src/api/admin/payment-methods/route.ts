import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { maskKey } from "../../../utils/payment-credentials"

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
        live_secret_key,
        live_webhook_secret,
        test_publishable_key,
        test_secret_key,
        test_webhook_secret,
        underlying_gateway,
        verification_mode,
        supported_cards,
        last_tested_at,
        last_test_status,
        last_test_message,
        metadata,
        created_at,
        updated_at
      FROM payment_method_config
      ORDER BY 
        CASE 
          WHEN provider_id = 'stripe' THEN 1
          WHEN provider_id = 'paypal' THEN 2
          WHEN provider_id = 'electronic_card' THEN 3
          ELSE 4 
        END ASC;
    `)

    const rows = result.rows || []

    const sanitizedMethods = rows.map((row: any) => {
      const isConfigured =
        row.provider_id === "stripe"
          ? Boolean(row.live_secret_key || row.test_secret_key)
          : row.provider_id === "paypal"
          ? Boolean(
              (row.environment === "live" ? row.live_secret_key : row.test_secret_key) &&
              (row.environment === "live" ? row.live_publishable_key : row.test_publishable_key)
            )
          : Boolean(row.underlying_gateway)

      return {
        id: row.id,
        provider_id: row.provider_id,
        name: row.name,
        display_title: row.display_title,
        description: row.description,
        is_active: Boolean(row.is_active),
        environment: row.environment || "live",
        is_configured: isConfigured,
        underlying_gateway: row.underlying_gateway || "stripe",
        verification_mode: row.verification_mode || "instant_verification",
        supported_cards: row.supported_cards || ["visa", "mastercard", "amex", "discover"],
        last_tested_at: row.last_tested_at,
        last_test_status: row.last_test_status,
        last_test_message: row.last_test_message,
        created_at: row.created_at,
        updated_at: row.updated_at,
        // Publishable keys are safe, but can be displayed as is
        live_publishable_key: row.live_publishable_key || "",
        test_publishable_key: row.test_publishable_key || "",
        // Sensitive credentials are ALWAYS masked in API responses
        live_secret_key_masked: maskKey(row.live_secret_key),
        test_secret_key_masked: maskKey(row.test_secret_key),
        live_webhook_secret_masked: maskKey(row.live_webhook_secret),
        test_webhook_secret_masked: maskKey(row.test_webhook_secret),
        // Flags to let frontend know whether secrets are present
        has_live_secret_key: Boolean(row.live_secret_key),
        has_test_secret_key: Boolean(row.test_secret_key),
        has_live_webhook_secret: Boolean(row.live_webhook_secret),
        has_test_webhook_secret: Boolean(row.test_webhook_secret),
      }
    })

    const totalCount = sanitizedMethods.length
    const activeCount = sanitizedMethods.filter((m: any) => m.is_active).length
    const inactiveCount = totalCount - activeCount

    res.json({
      payment_methods: sanitizedMethods,
      summary: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
      },
    })
  } catch (error: any) {
    console.error("[Admin Payment Methods GET Error]:", error)
    res.status(500).json({
      message: "Failed to retrieve payment method configurations",
      error: error.message,
    })
  }
}
