import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    const certRes = await client.query("SELECT * FROM webinar_certificate WHERE id = $1 AND deleted_at IS NULL", [id])
    if (certRes.rows.length === 0) {
      return res.status(404).json({ message: "Certificate not found" })
    }
    return res.json({ certificate: certRes.rows[0] })
  } catch (error: any) {
    console.error("Error in GET /admin/certificates/[id]:", error)
    return res.status(500).json({ message: "Failed to load certificate", error: error.message })
  } finally {
    client.release()
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { customer_name, signatory_name, signatory_title, issuer_name, action } = req.body as any

  const client = await pool.connect()
  try {
    if (action === "revoke") {
      const revokeRes = await client.query(
        `UPDATE webinar_certificate SET status = 'revoked', updated_at = now() WHERE id = $1 RETURNING *`,
        [id]
      )
      return res.json({ success: true, message: "Certificate revoked", certificate: revokeRes.rows[0] })
    }

    const updateRes = await client.query(
      `UPDATE webinar_certificate SET
        customer_name = COALESCE($1, customer_name),
        signatory_name = COALESCE($2, signatory_name),
        signatory_title = COALESCE($3, signatory_title),
        issuer_name = COALESCE($4, issuer_name),
        reissue_count = reissue_count + 1,
        status = 'reissued',
        updated_at = now()
      WHERE id = $5
      RETURNING *`,
      [customer_name, signatory_name, signatory_title, issuer_name, id]
    )

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: "Certificate not found" })
    }

    return res.json({ success: true, message: "Certificate reissued successfully", certificate: updateRes.rows[0] })
  } catch (error: any) {
    console.error("Error in POST /admin/certificates/[id]:", error)
    return res.status(500).json({ message: "Failed to update certificate", error: error.message })
  } finally {
    client.release()
  }
}
