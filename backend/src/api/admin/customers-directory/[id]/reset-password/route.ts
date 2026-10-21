import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import crypto from "crypto"
import { EmailSender } from "../../../../../utils/email-sender"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const client = await pool.connect()

  try {
    // 1. Fetch customer
    const custRes = await client.query(
      `SELECT id, email, first_name, last_name, COALESCE(metadata->>'account_status', 'active') AS account_status
       FROM customer
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    )

    if (custRes.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" })
    }

    const customer = custRes.rows[0]
    const email = customer.email.toLowerCase()

    // 2. Rate limit check (max 5 requests per 15 minutes)
    const recentRequestsRes = await client.query(
      `SELECT COUNT(id) AS count
       FROM customer_password_reset
       WHERE LOWER(email) = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
      [email]
    )
    const recentCount = parseInt(recentRequestsRes.rows[0]?.count || "0")
    if (recentCount >= 5) {
      return res.status(429).json({
        message: "Rate limit reached: A maximum of 5 password reset requests can be issued per 15 minutes for this customer.",
      })
    }

    // 3. Invalidate any previous unused tokens for this email
    await client.query(
      `UPDATE customer_password_reset SET used_at = NOW() WHERE LOWER(email) = $1 AND used_at IS NULL`,
      [email]
    )

    // 4. Generate high-entropy 32-byte hex token with 1-hour expiration
    const token = crypto.randomBytes(32).toString("hex")
    const tokenId = "cpr_" + crypto.randomBytes(12).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await client.query(
      `INSERT INTO customer_password_reset (id, customer_id, email, token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tokenId, customer.id, email, token, expiresAt]
    )

    const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:8000"
    const resetUrl = `${storefrontUrl}/us/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    // 5. Send password reset email via EmailSender
    const emailResult = await EmailSender.send({
      to: email,
      toName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || undefined,
      subject: "Reset your AcademyIO password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">AcademyIO</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Continuing Professional Education Marketplace</p>
          </div>
          <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 0;">Password Reset Request</h2>
            <p style="font-size: 14px; color: #475569;">
              Hello ${customer.first_name ? customer.first_name : "Member"},
            </p>
            <p style="font-size: 14px; color: #475569;">
              An administrator has initiated a password reset for your AcademyIO account (<strong>${email}</strong>). Click the secure link below to choose your new password.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Reset Your Password
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <strong>Security Notice:</strong> This reset link is valid for <strong>1 hour</strong> and can only be used once. If you did not request this change, please ignore this email or contact support@academyio.com.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">
              AcademyIO • Professional Education, CPE Accreditation & Compliance<br />
              <a href="${storefrontUrl}" style="color: #2563eb; text-decoration: none;">academyio.com</a>
            </p>
          </div>
        </div>
      `,
      text: `Hello ${customer.first_name || "Member"},\n\nAn administrator has initiated a password reset for your AcademyIO account (${email}).\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link expires in 1 hour and is single-use.\n\nAcademyIO Team`,
    })

    // 6. Record audit log
    const adminUser = (req as any).auth_context?.actor_id || "admin"
    const logId = "cal_" + crypto.randomBytes(12).toString("hex")
    await client.query(
      `INSERT INTO customer_audit_log (id, customer_id, admin_id, admin_email, action, details, created_at)
       VALUES ($1, $2, $3, $4, 'PASSWORD_RESET_EMAIL_SENT', $5, NOW())`,
      [
        logId,
        id,
        adminUser,
        "admin@academyio.com",
        JSON.stringify({
          recipient_email: email,
          email_provider: emailResult.provider,
          email_success: emailResult.success,
          expires_at: expiresAt.toISOString(),
        }),
      ]
    )

    console.log(`[ADMIN PASSWORD RESET] Generated and dispatched token for ${email}: ${resetUrl}`)

    res.json({
      success: true,
      message: `Password reset instructions successfully dispatched to ${email}.`,
      reset_link: resetUrl,
      expires_at: expiresAt.toISOString(),
      email_delivered: emailResult.success,
    })
  } catch (error: any) {
    console.error("Error in admin reset-password POST:", error)
    res.status(500).json({ message: "Failed to dispatch password reset email", error: error.message })
  } finally {
    client.release()
  }
}
