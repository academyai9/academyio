import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const query = req.query as Record<string, any>

    const providerFilter = (query.provider_id as string || "all").toLowerCase()
    const limit = Math.min(parseInt((query.limit as string) || "50", 10), 100)
    const offset = Math.max(parseInt((query.offset as string) || "0", 10), 0)

    const conditions: string[] = []
    const bindings: any[] = []

    if (providerFilter !== "all") {
      conditions.push("provider_id = ?")
      bindings.push(providerFilter)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const countRes = await pgConnection.raw(
      `SELECT count(*) as c FROM payment_method_audit_log ${whereClause};`,
      bindings
    )
    const totalCount = parseInt(countRes.rows?.[0]?.c || 0, 10)

    const listRes = await pgConnection.raw(
      `
      SELECT 
        l.id,
        l.payment_method_id,
        l.provider_id,
        l.action,
        l.admin_user_id,
        l.admin_email,
        l.details,
        l.previous_state,
        l.new_state,
        l.created_at,
        c.name as method_name
      FROM payment_method_audit_log l
      LEFT JOIN payment_method_config c ON c.id = l.payment_method_id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?;
    `,
      [...bindings, limit, offset]
    )

    res.json({
      audit_logs: listRes.rows || [],
      total: totalCount,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("[Admin Payment Method Audit Logs Error]:", error)
    res.status(500).json({
      message: "Failed to retrieve payment method audit logs",
      error: error.message,
    })
  }
}
