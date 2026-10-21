import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import crypto from "crypto"
import scryptKdf from "scrypt-kdf"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const body = req.body as Record<string, any>
  const newPassword = body.password as string

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." })
  }

  const client = await pool.connect()
  try {
    // 1. Fetch customer
    const custRes = await client.query(
      `SELECT id, email, first_name, last_name, metadata
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

    // 2. Hash password with scrypt-kdf (matching Medusa's exact parameters: logN=15, r=8, p=1)
    const passwordHash = (await scryptKdf.kdf(newPassword, { logN: 15, r: 8, p: 1 })).toString("base64")

    // 3. Find or create auth_identity
    let authRes = await client.query(
      `SELECT id FROM auth_identity WHERE app_metadata->>'customer_id' = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    )

    let authId: string
    if (authRes.rows.length === 0) {
      authId = "authid_" + crypto.randomBytes(12).toString("hex")
      await client.query(
        `INSERT INTO auth_identity (id, app_metadata, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [authId, JSON.stringify({ customer_id: id })]
      )
    } else {
      authId = authRes.rows[0].id
    }

    // 4. Update or insert provider_identity
    const piRes = await client.query(
      `SELECT id FROM provider_identity WHERE LOWER(entity_id) = $1 AND provider = 'emailpass' LIMIT 1`,
      [email]
    )

    if (piRes.rows.length > 0) {
      await client.query(
        `UPDATE provider_identity 
         SET provider_metadata = jsonb_set(COALESCE(provider_metadata, '{}'::jsonb), '{password}', to_jsonb($1::text)),
             auth_identity_id = $2,
             updated_at = NOW()
         WHERE LOWER(entity_id) = $3 AND provider = 'emailpass'`,
        [passwordHash, authId, email]
      )
    } else {
      const piId = "pi_" + crypto.randomBytes(12).toString("hex")
      await client.query(
        `INSERT INTO provider_identity (id, entity_id, provider, auth_identity_id, provider_metadata, created_at, updated_at)
         VALUES ($1, $2, 'emailpass', $3, $4, NOW(), NOW())`,
        [piId, email, authId, JSON.stringify({ password: passwordHash })]
      )
    }

    // 5. Update customer has_account and metadata
    await client.query(
      `UPDATE customer
       SET has_account = true,
           metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{require_password_change}', 'true'),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )

    // 6. Record audit log (never logging the password!)
    const adminUser = (req as any).auth_context?.actor_id || "admin"
    const logId = "cal_" + crypto.randomBytes(12).toString("hex")
    await client.query(
      `INSERT INTO customer_audit_log (id, customer_id, admin_id, admin_email, action, details, created_at)
       VALUES ($1, $2, $3, $4, 'PASSWORD_MANUALLY_SET', $5, NOW())`,
      [
        logId,
        id,
        adminUser,
        "admin@academyio.com",
        JSON.stringify({
          admin_action: "manual_password_reset",
          require_password_change: true,
          timestamp: new Date().toISOString(),
        }),
      ]
    )

    console.log(`[ADMIN SET PASSWORD] Securely updated password hash for customer ${email}`)

    res.json({
      success: true,
      message: `Password has been successfully updated for ${email}.`,
    })
  } catch (error: any) {
    console.error("Error setting customer password:", error)
    res.status(500).json({ message: "Failed to update password", error: error.message })
  } finally {
    client.release()
  }
}
