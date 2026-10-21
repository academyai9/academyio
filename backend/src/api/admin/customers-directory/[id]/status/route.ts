import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import crypto from "crypto"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const body = req.body as Record<string, any>
  const status = (body.status as string || "").toLowerCase()

  if (!["active", "inactive", "suspended"].includes(status)) {
    return res.status(400).json({ message: "Invalid status. Allowed values: active, inactive, suspended." })
  }

  const client = await pool.connect()
  try {
    const custRes = await client.query(
      `SELECT id, email, metadata FROM customer WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id]
    )
    if (custRes.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" })
    }

    const customer = custRes.rows[0]
    const oldStatus = customer.metadata?.account_status || "active"

    await client.query(
      `UPDATE customer
       SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{account_status}', to_jsonb($1::text)),
           updated_at = NOW()
       WHERE id = $2`,
      [status, id]
    )

    // Record audit log
    const adminUser = (req as any).auth_context?.actor_id || "admin"
    const logId = "cal_" + crypto.randomBytes(12).toString("hex")
    await client.query(
      `INSERT INTO customer_audit_log (id, customer_id, admin_id, admin_email, action, details, created_at)
       VALUES ($1, $2, $3, $4, 'STATUS_CHANGED', $5, NOW())`,
      [
        logId,
        id,
        adminUser,
        "admin@academyio.com",
        JSON.stringify({ from: oldStatus, to: status, note: body.note || null }),
      ]
    )

    res.json({
      success: true,
      status,
      message: `Customer account status updated to ${status}.`,
    })
  } catch (error: any) {
    console.error("Error updating customer status:", error)
    res.status(500).json({ message: "Failed to update customer status", error: error.message })
  } finally {
    client.release()
  }
}
