import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import crypto from "crypto"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body as any) || {}
  const rawEmail = (body.email as string || "").trim().toLowerCase()

  if (!rawEmail) {
    return res.status(400).json({ message: "Email address is required." })
  }

  const client = await pool.connect()
  try {
    // 1. Check if customer exists in DB
    const custRes = await client.query(
      `SELECT c.id, c.email, c.first_name, c.last_name, ai.id AS auth_id
       FROM customer c
       LEFT JOIN auth_identity ai ON (ai.app_metadata->>'customer_id' = c.id AND ai.deleted_at IS NULL)
       WHERE LOWER(c.email) = LOWER($1) AND c.deleted_at IS NULL
       LIMIT 1`,
      [rawEmail]
    )

    if (custRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions.",
        has_account: false,
      })
    }

    const customer = custRes.rows[0]

    // If customer has no auth_identity (guest checkout user)
    if (!customer.auth_id) {
      return res.status(200).json({
        success: true,
        is_guest: true,
        message: "An account was found for your past webinar purchases, but no password has been created yet. Please use the Register page to set your password and access your dashboard.",
      })
    }

    // 2. Invalidate any existing unused reset tokens for this email
    await client.query(
      `UPDATE customer_password_reset SET used_at = NOW() WHERE LOWER(email) = LOWER($1) AND used_at IS NULL`,
      [rawEmail]
    )

    // 3. Generate a secure, high-entropy 32-byte hex token
    const token = crypto.randomBytes(32).toString("hex")
    const id = "cpr_" + crypto.randomBytes(12).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour validity

    await client.query(
      `INSERT INTO customer_password_reset (id, customer_id, email, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, customer.id, rawEmail, token, expiresAt]
    )

    const resetLink = `/us/reset-password?token=${token}&email=${encodeURIComponent(rawEmail)}`
    console.log(`[PASSWORD RESET] Reset link generated for ${rawEmail}: ${resetLink}`)

    return res.status(200).json({
      success: true,
      message: "If an account exists with this email, you will receive password reset instructions.",
      has_account: true,
      reset_token: token,
      reset_link: resetLink,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error: any) {
    console.error("Error in password reset request:", error)
    return res.status(500).json({ message: "An error occurred while processing your request. Please try again." })
  } finally {
    client.release()
  }
}
