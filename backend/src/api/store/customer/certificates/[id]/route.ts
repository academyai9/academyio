import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSharedPool } from "../../../../../utils/db-pool"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id
  const { id } = req.params

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const pool = getSharedPool()
  const client = await pool.connect()
  try {
    const certRes = await client.query(
      `SELECT c.*, w.slug as webinar_slug, w.category as webinar_category, w.event_date as webinar_event_date
       FROM webinar_certificate c
       LEFT JOIN webinar w ON c.webinar_id = w.id
       WHERE c.id = $1 AND c.customer_id = $2 AND c.deleted_at IS NULL`,
      [id, customerId]
    )

    if (certRes.rows.length === 0) {
      return res.status(404).json({ message: "Certificate not found or unauthorized access" })
    }

    return res.json({ certificate: certRes.rows[0] })
  } catch (error: any) {
    console.error("Error in GET /customer/certificates/[id]:", error)
    return res.status(500).json({ message: "Failed to load certificate", error: error.message })
  } finally {
    client.release()
  }
}
