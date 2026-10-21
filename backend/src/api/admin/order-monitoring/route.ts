import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const query = req.query as Record<string, any>

    const statusFilter = (query.status as string || "all").toLowerCase()
    const severityFilter = (query.severity as string || "all").toLowerCase()
    const typeFilter = (query.type as string || "all").toLowerCase()
    const limit = Math.min(parseInt(query.limit as string || "50", 10), 100)
    const offset = Math.max(parseInt(query.offset as string || "0", 10), 0)

    const conditions: string[] = []
    const bindings: any[] = []

    if (statusFilter !== "all") {
      conditions.push("status = ?")
      bindings.push(statusFilter)
    }
    if (severityFilter !== "all") {
      conditions.push("severity = ?")
      bindings.push(severityFilter)
    }
    if (typeFilter !== "all") {
      conditions.push("incident_type = ?")
      bindings.push(typeFilter)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // 1. Overall Metrics
    const metricsRes = await pgConnection.raw(`
      SELECT
        COUNT(id) as total_incidents,
        COUNT(CASE WHEN status IN ('new', 'investigating', 'awaiting_payment_verification') THEN 1 END) as open_incidents,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_incidents,
        COUNT(CASE WHEN severity = 'critical' AND status != 'resolved' THEN 1 END) as critical_unresolved,
        COUNT(CASE WHEN incident_type = 'missing_order' AND status != 'resolved' THEN 1 END) as missing_orders_unresolved,
        COUNT(CASE WHEN incident_type = 'missing_webinar_access' AND status != 'resolved' THEN 1 END) as missing_access_unresolved,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_incidents,
        COUNT(CASE WHEN email_alert_sent = true THEN 1 END) as alerts_sent_count
      FROM order_monitoring_incident;
    `)
    const metrics = metricsRes.rows?.[0] || {}

    // 2. Count for current filter
    const countRes = await pgConnection.raw(
      `SELECT COUNT(id) as filtered_count FROM order_monitoring_incident ${whereClause};`,
      bindings
    )
    const filteredCount = parseInt(countRes.rows?.[0]?.filtered_count || 0, 10)

    // 3. Incidents List
    const listRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_incident
       ${whereClause}
       ORDER BY 
         CASE WHEN status = 'new' THEN 1 WHEN status = 'investigating' THEN 2 WHEN status = 'awaiting_payment_verification' THEN 3 ELSE 4 END ASC,
         created_at DESC
       LIMIT ? OFFSET ?;`,
      [...bindings, limit, offset]
    )

    // 4. Monitoring Settings
    const setRes = await pgConnection.raw(`SELECT key, value FROM order_monitoring_setting;`)
    const settings: Record<string, string> = {}
    for (const r of setRes.rows || []) {
      settings[r.key] = r.value
    }

    res.json({
      incidents: listRes.rows || [],
      count: filteredCount,
      limit,
      offset,
      metrics: {
        total: parseInt(metrics.total_incidents || 0, 10),
        open: parseInt(metrics.open_incidents || 0, 10),
        new: parseInt(metrics.new_incidents || 0, 10),
        critical: parseInt(metrics.critical_unresolved || 0, 10),
        missing_orders: parseInt(metrics.missing_orders_unresolved || 0, 10),
        missing_access: parseInt(metrics.missing_access_unresolved || 0, 10),
        resolved: parseInt(metrics.resolved_incidents || 0, 10),
        alerts_sent: parseInt(metrics.alerts_sent_count || 0, 10),
      },
      settings: {
        last_reconciliation_at: settings.last_reconciliation_at || null,
        grace_period_minutes: parseInt(settings.grace_period_minutes || "5", 10),
        alert_recipient_email: settings.alert_recipient_email || "support@academyio.com",
        monitoring_enabled: settings.monitoring_enabled !== "false",
      },
    })
  } catch (error: any) {
    console.error("[Admin Order Monitoring List Error]:", error)
    res.status(500).json({
      message: "Failed to fetch order monitoring incidents",
      error: error.message,
    })
  }
}
