import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import crypto from "crypto"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { ids?: string[] }
  const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : []

  if (ids.length === 0) {
    return res.status(400).json({ message: "No customer IDs provided for bulk deletion." })
  }

  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Find all customers to delete
    const custRes = await client.query(
      `SELECT id, email FROM customer WHERE id = ANY($1) AND deleted_at IS NULL`,
      [ids]
    )

    if (custRes.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ message: "None of the specified customers were found or already deleted." })
    }

    const foundIds = custRes.rows.map((r: any) => r.id)
    const foundEmails = custRes.rows.map((r: any) => r.email?.toLowerCase()).filter(Boolean)

    // 1. Unlink existing orders so financial audit trail remains safe
    await client.query(`UPDATE "order" SET customer_id = NULL WHERE customer_id = ANY($1)`, [foundIds])

    // 2. Unlink carts
    await client.query(`UPDATE cart SET customer_id = NULL WHERE customer_id = ANY($1)`, [foundIds])

    // 3. Clean up customer custom tables
    if (foundEmails.length > 0) {
      await client.query(
        `DELETE FROM customer_entitlement WHERE customer_id = ANY($1) OR LOWER(customer_email) = ANY($2)`,
        [foundIds, foundEmails]
      )
      await client.query(
        `DELETE FROM customer_subscription WHERE customer_id = ANY($1) OR LOWER(customer_email) = ANY($2)`,
        [foundIds, foundEmails]
      )
      await client.query(
        `DELETE FROM customer_password_reset WHERE customer_id = ANY($1) OR LOWER(email) = ANY($2)`,
        [foundIds, foundEmails]
      )
    } else {
      await client.query(`DELETE FROM customer_entitlement WHERE customer_id = ANY($1)`, [foundIds])
      await client.query(`DELETE FROM customer_subscription WHERE customer_id = ANY($1)`, [foundIds])
      await client.query(`DELETE FROM customer_password_reset WHERE customer_id = ANY($1)`, [foundIds])
    }

    await client.query(`DELETE FROM quiz_attempt WHERE customer_id = ANY($1)`, [foundIds])
    await client.query(`DELETE FROM webinar_certificate WHERE customer_id = ANY($1)`, [foundIds])
    await client.query(`DELETE FROM customer_account_holder WHERE customer_id = ANY($1)`, [foundIds])

    // 4. Remove provider & auth identities
    await client.query(
      `DELETE FROM provider_identity WHERE auth_identity_id IN (
         SELECT id FROM auth_identity WHERE app_metadata->>'customer_id' = ANY($1)
       )`,
      [foundIds]
    )
    await client.query(
      `DELETE FROM auth_identity WHERE app_metadata->>'customer_id' = ANY($1)`,
      [foundIds]
    )

    // 5. Soft-delete customer records
    await client.query(`UPDATE customer SET deleted_at = NOW() WHERE id = ANY($1)`, [foundIds])

    // 6. Attempt hard delete if possible
    try {
      await client.query(`DELETE FROM customer WHERE id = ANY($1)`, [foundIds])
    } catch (ignoreErr) {
      // Soft-delete is active
    }

    // 7. Audit log entries
    for (const c of custRes.rows) {
      const logId = "cal_" + crypto.randomBytes(12).toString("hex")
      await client.query(
        `INSERT INTO customer_audit_log (id, customer_id, admin_email, action, details, created_at)
         VALUES ($1, $2, 'admin@academyio.com', 'BULK_CUSTOMER_DELETED', $3, NOW())`,
        [logId, c.id, JSON.stringify({ email: c.email, deleted_at: new Date().toISOString() })]
      )
    }

    await client.query("COMMIT")

    res.json({
      success: true,
      count: foundIds.length,
      message: `Successfully deleted ${foundIds.length} customer account(s).`,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error in /admin/customers-directory/bulk-delete POST:", error)
    res.status(500).json({ message: "Failed to perform bulk customer deletion", error: error.message })
  } finally {
    client.release()
  }
}
