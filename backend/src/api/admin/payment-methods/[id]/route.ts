import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { maskKey, isMaskedValue } from "../../../../utils/payment-credentials"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const result = await pgConnection.raw(
      `SELECT * FROM payment_method_config WHERE id = ? OR provider_id = ?;`,
      [id, id]
    )

    const row = result.rows?.[0]
    if (!row) {
      return res.status(404).json({ message: `Payment method '${id}' not found` })
    }

    // Mask secrets
    const sanitized = {
      ...row,
      is_active: Boolean(row.is_active),
      live_secret_key_masked: maskKey(row.live_secret_key),
      test_secret_key_masked: maskKey(row.test_secret_key),
      live_webhook_secret_masked: maskKey(row.live_webhook_secret),
      test_webhook_secret_masked: maskKey(row.test_webhook_secret),
      live_secret_key: undefined,
      test_secret_key: undefined,
      live_webhook_secret: undefined,
      test_webhook_secret: undefined,
      has_live_secret_key: Boolean(row.live_secret_key),
      has_test_secret_key: Boolean(row.test_secret_key),
      has_live_webhook_secret: Boolean(row.live_webhook_secret),
      has_test_webhook_secret: Boolean(row.test_webhook_secret),
    }

    res.json({ payment_method: sanitized })
  } catch (error: any) {
    console.error("[Admin Payment Method GET Error]:", error)
    res.status(500).json({
      message: "Failed to retrieve payment method",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as Record<string, any>) || {}

    // Find current config
    const currentRes = await pgConnection.raw(
      `SELECT * FROM payment_method_config WHERE id = ? OR provider_id = ?;`,
      [id, id]
    )
    const current = currentRes.rows?.[0]
    if (!current) {
      return res.status(404).json({ message: `Payment method '${id}' not found` })
    }

    const providerId = current.provider_id
    const targetId = current.id

    // 1. Resolve updated values (keep existing if masked or undefined)
    const newIsActive =
      body.is_active !== undefined ? Boolean(body.is_active) : current.is_active
    const newEnvironment =
      body.environment !== undefined ? body.environment : (current.environment || "live")
    const newDisplayTitle =
      body.display_title !== undefined ? body.display_title.trim() : current.display_title
    const newDescription =
      body.description !== undefined ? body.description.trim() : current.description
    const newUnderlyingGateway =
      body.underlying_gateway !== undefined ? body.underlying_gateway : current.underlying_gateway
    const newVerificationMode =
      body.verification_mode !== undefined ? body.verification_mode : current.verification_mode
    const newSupportedCards =
      body.supported_cards !== undefined ? JSON.stringify(body.supported_cards) : JSON.stringify(current.supported_cards)

    // Credentials resolution
    const resolveSecret = (incoming: any, existing: string | null) => {
      if (incoming === undefined || incoming === null) return existing
      if (typeof incoming === "string" && (isMaskedValue(incoming) || incoming.trim() === "")) {
        return existing
      }
      return incoming.trim()
    }

    const resolvePub = (incoming: any, existing: string | null) => {
      if (incoming === undefined || incoming === null) return existing
      if (typeof incoming === "string" && isMaskedValue(incoming)) return existing
      return incoming.trim()
    }

    const newLivePub = resolvePub(body.live_publishable_key, current.live_publishable_key)
    const newLiveSecret = resolveSecret(body.live_secret_key, current.live_secret_key)
    const newLiveWebhook = resolveSecret(body.live_webhook_secret, current.live_webhook_secret)

    const newTestPub = resolvePub(body.test_publishable_key, current.test_publishable_key)
    const newTestSecret = resolveSecret(body.test_secret_key, current.test_secret_key)
    const newTestWebhook = resolveSecret(body.test_webhook_secret, current.test_webhook_secret)

    // 2. Strict validation if method is being activated
    if (newIsActive && !current.is_active) {
      if (providerId === "stripe") {
        const activeSecret = newEnvironment === "live" ? newLiveSecret : newTestSecret
        if (!activeSecret || activeSecret.trim().length === 0) {
          return res.status(400).json({
            message: `Cannot activate Stripe in ${newEnvironment} mode: A valid Secret Key is required. Please provide the key before enabling.`,
            error: "MISSING_REQUIRED_CREDENTIALS",
          })
        }
      } else if (providerId === "paypal") {
        const activePub = newEnvironment === "live" ? newLivePub : newTestPub
        const activeSecret = newEnvironment === "live" ? newLiveSecret : newTestSecret
        if (!activePub || activePub.trim().length === 0 || !activeSecret || activeSecret.trim().length === 0) {
          return res.status(400).json({
            message: `Cannot activate PayPal in ${newEnvironment} mode: Both Client ID and Client Secret are required. Please configure credentials before enabling.`,
            error: "MISSING_REQUIRED_CREDENTIALS",
          })
        }
      } else if (providerId === "electronic_card") {
        if (newUnderlyingGateway === "stripe") {
          const stripeRes = await pgConnection.raw(
            `SELECT live_secret_key, test_secret_key, environment FROM payment_method_config WHERE provider_id = 'stripe';`
          )
          const stripeRow = stripeRes.rows?.[0]
          const stripeKey = stripeRow?.environment === "live" ? stripeRow?.live_secret_key : stripeRow?.test_secret_key
          if (!stripeKey) {
            return res.status(400).json({
              message: "Cannot activate Electronic Card Payment: The underlying Stripe gateway is not configured with a Secret Key.",
              error: "GATEWAY_NOT_CONFIGURED",
            })
          }
        }
      }
    }

    // 3. Update database
    await pgConnection.raw(
      `
      UPDATE payment_method_config
      SET
        display_title = ?,
        description = ?,
        is_active = ?,
        environment = ?,
        live_publishable_key = ?,
        live_secret_key = ?,
        live_webhook_secret = ?,
        test_publishable_key = ?,
        test_secret_key = ?,
        test_webhook_secret = ?,
        underlying_gateway = ?,
        verification_mode = ?,
        supported_cards = ?::jsonb,
        updated_at = now()
      WHERE id = ?;
    `,
      [
        newDisplayTitle,
        newDescription,
        newIsActive,
        newEnvironment,
        newLivePub,
        newLiveSecret,
        newLiveWebhook,
        newTestPub,
        newTestSecret,
        newTestWebhook,
        newUnderlyingGateway,
        newVerificationMode,
        newSupportedCards,
        targetId,
      ]
    )

    // 4. Audit Logging
    const adminUser =
      (req as any).auth_context?.actor_id ||
      (req.headers["x-admin-email"] as string) ||
      "admin@academyio.com"

    let action = "configured"
    const detailsArr: string[] = []

    if (newIsActive !== current.is_active) {
      action = newIsActive ? "activated" : "deactivated"
      detailsArr.push(newIsActive ? "Enabled payment method" : "Disabled payment method")
    }

    if (newEnvironment !== current.environment) {
      detailsArr.push(`Switched environment from ${current.environment} to ${newEnvironment}`)
    }

    if (newDisplayTitle !== current.display_title) {
      detailsArr.push(`Updated display title to "${newDisplayTitle}"`)
    }

    if (
      (newLiveSecret && newLiveSecret !== current.live_secret_key) ||
      (newTestSecret && newTestSecret !== current.test_secret_key) ||
      (newLivePub && newLivePub !== current.live_publishable_key) ||
      (newTestPub && newTestPub !== current.test_publishable_key)
    ) {
      detailsArr.push("Updated API credentials (keys securely stored and masked)")
      if (action === "configured") action = "credentials_updated"
    }

    if (detailsArr.length === 0) {
      detailsArr.push("Saved configuration settings")
    }

    const auditId = `pmal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    await pgConnection.raw(
      `
      INSERT INTO payment_method_audit_log (
        id, payment_method_id, provider_id, action, admin_user_id, admin_email,
        previous_state, new_state, details, created_at
      ) VALUES (?, ?, ?, ?, 'ADMIN', ?, ?::jsonb, ?::jsonb, ?, now());
    `,
      [
        auditId,
        targetId,
        providerId,
        action,
        adminUser,
        JSON.stringify({
          is_active: current.is_active,
          environment: current.environment,
          display_title: current.display_title,
        }),
        JSON.stringify({
          is_active: newIsActive,
          environment: newEnvironment,
          display_title: newDisplayTitle,
        }),
        detailsArr.join(". "),
      ]
    )

    res.json({
      success: true,
      message: `Payment method '${current.name}' updated successfully`,
      payment_method: {
        id: targetId,
        provider_id: providerId,
        name: current.name,
        display_title: newDisplayTitle,
        description: newDescription,
        is_active: newIsActive,
        environment: newEnvironment,
        live_publishable_key: newLivePub,
        test_publishable_key: newTestPub,
        live_secret_key_masked: maskKey(newLiveSecret),
        test_secret_key_masked: maskKey(newTestSecret),
        live_webhook_secret_masked: maskKey(newLiveWebhook),
        test_webhook_secret_masked: maskKey(newTestWebhook),
        has_live_secret_key: Boolean(newLiveSecret),
        has_test_secret_key: Boolean(newTestSecret),
        has_live_webhook_secret: Boolean(newLiveWebhook),
        has_test_webhook_secret: Boolean(newTestWebhook),
        underlying_gateway: newUnderlyingGateway,
        verification_mode: newVerificationMode,
      },
    })
  } catch (error: any) {
    console.error("[Admin Payment Method POST Error]:", error)
    res.status(500).json({
      message: "Failed to update payment method",
      error: error.message,
    })
  }
}
