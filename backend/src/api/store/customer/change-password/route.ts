import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import scryptKdf from "scrypt-kdf"
import { getSharedPool } from "../../../../utils/db-pool"
import { checkRateLimit, getClientIp } from "../../../../utils/rate-limiter"

/**
 * POST /store/customer/change-password
 * Strictly authenticated endpoint allowing a logged-in customer to change their password
 * after verifying their current password against Medusa's scrypt-kdf hash.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to change password." })
  }

  // Rate limit by both customerId and client IP to prevent brute-force guessing of current_password
  const clientIp = getClientIp(req)
  const ipLimit = checkRateLimit("pw_change_ip", clientIp, 10, 15 * 60 * 1000)
  const userLimit = checkRateLimit("pw_change_user", customerId, 5, 15 * 60 * 1000)
  if (!ipLimit.allowed || !userLimit.allowed) {
    return res.status(429).json({
      message: "Too many password change attempts. Please wait 15 minutes and try again.",
    })
  }

  const body = (req.body as Record<string, any>) || {}
  const currentPassword = typeof body.current_password === "string" ? body.current_password : ""
  const newPassword = typeof body.new_password === "string" ? body.new_password : ""

  if (!currentPassword) {
    return res.status(400).json({ message: "Current password is required." })
  }

  if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({
      message: "New password must be between 8 and 128 characters long.",
    })
  }

  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return res.status(400).json({
      message: "New password must include at least one letter and one number.",
    })
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "New password must be different from your current password.",
    })
  }

  const pool = getSharedPool()
  const client = await pool.connect()
  try {
    // 1. Resolve authenticated customer's email directly from DB using verified actor_id
    const custRes = await client.query(
      `SELECT id, email FROM customer WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [customerId]
    )

    if (custRes.rows.length === 0 || !custRes.rows[0].email) {
      return res.status(404).json({ message: "Customer account not found." })
    }

    const customerEmail = custRes.rows[0].email.toLowerCase()

    // 2. Fetch existing emailpass provider_identity
    const piRes = await client.query(
      `SELECT id, provider_metadata
       FROM provider_identity
       WHERE LOWER(entity_id) = LOWER($1) AND provider = 'emailpass' AND deleted_at IS NULL
       LIMIT 1`,
      [customerEmail]
    )

    if (piRes.rows.length === 0) {
      return res.status(404).json({
        message: "No email/password login credentials found for this account.",
      })
    }

    const piRow = piRes.rows[0]
    const storedHash = piRow.provider_metadata?.password

    if (!storedHash || typeof storedHash !== "string") {
      return res.status(400).json({
        message: "Unable to verify current password. Please use the Forgot Password flow.",
      })
    }

    // 3. Verify current password using Medusa's scrypt-kdf verifier
    let isCurrentValid = false
    try {
      isCurrentValid = await scryptKdf.verify(Buffer.from(storedHash, "base64"), currentPassword)
    } catch {
      isCurrentValid = false
    }

    if (!isCurrentValid) {
      return res.status(400).json({
        message: "Current password is incorrect. Please check and try again.",
      })
    }

    // 4. Hash new password using Medusa v2's exact scrypt-kdf parameters
    const newPasswordHash = (await scryptKdf.kdf(newPassword, { logN: 15, r: 8, p: 1 })).toString("base64")

    // 5. Update password in provider_identity and invalidate any outstanding reset tokens
    await client.query("BEGIN")
    try {
      await client.query(
        `UPDATE provider_identity
         SET provider_metadata = jsonb_set(COALESCE(provider_metadata, '{}'::jsonb), '{password}', to_jsonb($1::text)),
             updated_at = NOW()
         WHERE id = $2`,
        [newPasswordHash, piRow.id]
      )

      await client.query(
        `UPDATE customer_password_reset
         SET used_at = NOW()
         WHERE LOWER(email) = LOWER($1) AND used_at IS NULL`,
        [customerEmail]
      ).catch(() => null)

      await client.query("COMMIT")
    } catch (txErr) {
      await client.query("ROLLBACK")
      throw txErr
    }

    return res.status(200).json({
      success: true,
      message: "Your password has been changed successfully.",
    })
  } catch (error: any) {
    console.error("[Change Password Error]:", error?.message || error)
    return res.status(500).json({
      message: "Failed to update password. Please try again later.",
    })
  } finally {
    client.release()
  }
}
