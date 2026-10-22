import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureNewsletterTables } from "../../../../utils/newsletter-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureNewsletterTables(pgConnection)

    const query = req.query as Record<string, any>
    const status = query.status || "active"

    let sql = `SELECT email, first_name, status, consent_source, verified_at, created_at FROM newsletter_subscribers`
    const params: any[] = []

    if (status !== "all") {
      sql += ` WHERE status = ?`
      params.push(status)
    }

    sql += ` ORDER BY created_at DESC;`

    const rowsRes = await pgConnection.raw(sql, params)
    const rows = rowsRes.rows || []

    // Build CSV
    const headers = ["Email", "First Name", "Status", "Consent Source", "Verified Date", "Subscribed Date"]
    const csvLines = [headers.join(",")]

    for (const r of rows) {
      const email = `"${(r.email || "").replace(/"/g, '""')}"`
      const firstName = `"${(r.first_name || "").replace(/"/g, '""')}"`
      const st = `"${r.status}"`
      const source = `"${(r.consent_source || "").replace(/"/g, '""')}"`
      const verified = r.verified_at ? `"${new Date(r.verified_at).toISOString()}"` : '""'
      const created = r.created_at ? `"${new Date(r.created_at).toISOString()}"` : '""'
      csvLines.push([email, firstName, st, source, verified, created].join(","))
    }

    const csvContent = csvLines.join("\n")

    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="academyio-newsletter-subscribers-${status}-${Date.now()}.csv"`
    )
    return res.status(200).send(csvContent)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to export subscribers." })
  }
}
