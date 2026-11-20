import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import scryptKdf from "scrypt-kdf"
import { getSharedPool } from "../../../../utils/db-pool"
import { checkRateLimit, getClientIp } from "../../../../utils/rate-limiter"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const clientIp = getClientIp(req)
  const ipLimit = checkRateLimit("pw_reset_confirm_ip", clientIp, 10, 15 * 60 * 1000)
  if (!ipLimit.allowed) {
    return res.status(429).json({
      message: "Too many password reset attempts. Please try again later.",
    })
  }

  const body = (req.body as any) || {}
  const token = (body.token as string || "").trim()
  const email = (body.email as string || "").trim().toLowerCase()
  const password = body.password as string

  if (!token) {
    return res.status(400).json({ message: "Reset token is missing or invalid." })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters in length." })
  }

  const pool = getSharedPool()
  const client = await pool.connect()
  try {
    // 1. Verify token in customer_password_reset
    let tokenQuery = `SELECT * FROM customer_password_reset WHERE token = $1 AND used_at IS NULL AND expires_at > NOW() LIMIT 1`
    let queryParams: any[] = [token]

    if (email) {
      tokenQuery = `SELECT * FROM customer_password_reset WHERE token = $1 AND LOWER(email) = LOWER($2) AND used_at IS NULL AND expires_at > NOW() LIMIT 1`
      queryParams = [token, email]
    }

    const tokenRes = await client.query(tokenQuery, queryParams)
    if (tokenRes.rows.length === 0) {
      return res.status(400).json({
        message: "The password reset link is invalid, expired, or has already been used. Please request a new one.",
      })
    }

    const resetRecord = tokenRes.rows[0]
    const targetEmail = resetRecord.email.toLowerCase()

    // 2. Hash new password with scrypt-kdf (matching Medusa's exact parameters)
    const passwordHash = (await scryptKdf.kdf(password, { logN: 15, r: 8, p: 1 })).toString("base64")

    // 3. Update password in provider_identity
    const updatePi = await client.query(
      `UPDATE provider_identity 
       SET provider_metadata = jsonb_set(COALESCE(provider_metadata, '{}'::jsonb), '{password}', to_jsonb($1::text)),
           updated_at = NOW()
       WHERE LOWER(entity_id) = LOWER($2) AND provider = 'emailpass'
       RETURNING id`,
      [passwordHash, targetEmail]
    )

    if (updatePi.rowCount === 0) {
      return res.status(404).json({ message: "No matching login account found for this customer email." })
    }

    // 4. Mark token as consumed
    await client.query(
      `UPDATE customer_password_reset SET used_at = NOW() WHERE id = $1`,
      [resetRecord.id]
    )

    console.log(`[PASSWORD RESET] Successfully updated password for ${targetEmail}`)

    return res.status(200).json({
      success: true,
      message: "Your password has been successfully reset. You may now sign in with your new credentials.",
    })
  } catch (error: any) {
    console.error("Error confirming password reset:", error)
    return res.status(500).json({ message: "Failed to reset password. Please try again." })
  } finally {
    client.release()
  }
}
