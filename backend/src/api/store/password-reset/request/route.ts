import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import crypto from "crypto"
import { getSharedPool } from "../../../../utils/db-pool"
import { EmailSender } from "../../../../utils/email-sender"
import { checkRateLimit, getClientIp } from "../../../../utils/rate-limiter"

const GENERIC_RESPONSE_MESSAGE =
  "If an account exists with this email, you will receive password reset instructions shortly."

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body as any) || {}
  const rawEmail = ((body.email as string) || "").trim().toLowerCase()

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return res.status(400).json({ message: "A valid email address is required." })
  }

  // Rate limit by IP and target email to prevent abuse & enumeration flooding
  const clientIp = getClientIp(req)
  const ipLimit = checkRateLimit("pw_reset_ip", clientIp, 10, 15 * 60 * 1000)
  if (!ipLimit.allowed) {
    return res.status(429).json({
      message: "Too many password reset requests. Please try again later.",
    })
  }

  const emailLimit = checkRateLimit("pw_reset_email", rawEmail, 3, 15 * 60 * 1000)
  if (!emailLimit.allowed) {
    // Return uniform 200 to prevent account enumeration
    return res.status(200).json({
      success: true,
      message: GENERIC_RESPONSE_MESSAGE,
    })
  }

  const pool = getSharedPool()
  const client = await pool.connect()
  try {
    // Ensure customer_password_reset table exists on Neon PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_password_reset (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch(() => null)

    // 1. Check if customer with an active login identity exists
    const custRes = await client.query(
      `SELECT c.id, c.email, c.first_name, c.last_name, ai.id AS auth_id
       FROM customer c
       LEFT JOIN auth_identity ai ON (ai.app_metadata->>'customer_id' = c.id AND ai.deleted_at IS NULL)
       WHERE LOWER(c.email) = LOWER($1) AND c.deleted_at IS NULL
       LIMIT 1`,
      [rawEmail]
    )

    if (custRes.rows.length === 0 || !custRes.rows[0].auth_id) {
      // Uniform response regardless of whether account exists or is guest-only
      return res.status(200).json({
        success: true,
        message: GENERIC_RESPONSE_MESSAGE,
      })
    }

    const customer = custRes.rows[0]

    // 2. Invalidate any existing unused reset tokens for this email
    await client.query(
      `UPDATE customer_password_reset SET used_at = NOW() WHERE LOWER(email) = LOWER($1) AND used_at IS NULL`,
      [rawEmail]
    )

    // 3. Generate a secure, high-entropy 32-byte hex token (single-use, 1-hour expiry)
    const token = crypto.randomBytes(32).toString("hex")
    const id = "cpr_" + crypto.randomBytes(12).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await client.query(
      `INSERT INTO customer_password_reset (id, customer_id, email, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, customer.id, rawEmail, token, expiresAt]
    )

    const storefrontUrl = (
      process.env.STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://www.academyio.com"
    ).replace(/\/$/, "")
    const resetUrl = `${storefrontUrl}/us/reset-password?token=${token}&email=${encodeURIComponent(rawEmail)}`

    const sendResult = await EmailSender.send({
      to: rawEmail,
      toName: customer.first_name || undefined,
      subject: "Reset Your AcademyIO Password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">Password Reset Request</h2>
          <p>Hello ${customer.first_name || "Member"},</p>
          <p>We received a request to reset the password for your AcademyIO account. Click the button below to choose a new password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
          </p>
          <p style="font-size: 13px; color: #475569;">This link expires in 1 hour and can only be used once. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
      text: `Hello ${customer.first_name || "Member"},\n\nWe received a request to reset your AcademyIO password. Use the link below within 1 hour:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    })

    if (!sendResult.success) {
      console.error("[PASSWORD RESET] Failed to dispatch reset email:", sendResult.error)
    } else if (sendResult.provider === "console") {
      console.warn(
        "[PASSWORD RESET WARNING] EmailSender is in 'console' mode — configure RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS in Render environment variables to deliver live emails."
      )
    }

    // Never return reset_token, reset_link, or account-existence flags in the HTTP response
    return res.status(200).json({
      success: true,
      message: GENERIC_RESPONSE_MESSAGE,
    })
  } catch (error: any) {
    console.error("Error in password reset request:", error?.message || error)
    return res.status(500).json({ message: "An error occurred while processing your request. Please try again." })
  } finally {
    client.release()
  }
}
