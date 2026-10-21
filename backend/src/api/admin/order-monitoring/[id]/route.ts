import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const incRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_incident WHERE id = ?;`,
      [id]
    )
    const incident = incRes.rows?.[0]
    if (!incident) {
      return res.status(404).json({ message: `Incident '${id}' not found` })
    }

    // Audit logs
    const auditRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_audit_log WHERE incident_id = ? ORDER BY created_at DESC;`,
      [id]
    )

    // Email delivery logs
    const emailRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_email_log WHERE incident_id = ? ORDER BY created_at DESC;`,
      [id]
    )

    // Linked Order if any
    let linkedOrder = null
    if (incident.order_id) {
      const ordRes = await pgConnection.raw(
        `SELECT o.id, o.display_id, o.status, o.email, o.created_at,
                s.totals->>'current_order_total' as order_total,
                s.totals->>'paid_total' as paid_total
         FROM "order" o
         LEFT JOIN order_summary s ON s.order_id = o.id
         WHERE o.id = ?;`,
        [incident.order_id]
      )
      linkedOrder = ordRes.rows?.[0] || null
    }

    // Linked Cart if any
    let linkedCart = null
    if (incident.checkout_reference) {
      const cartRes = await pgConnection.raw(
        `SELECT id, email, completed_at, created_at FROM cart WHERE id = ?;`,
        [incident.checkout_reference]
      )
      linkedCart = cartRes.rows?.[0] || null
    }

    res.json({
      incident,
      audit_logs: auditRes.rows || [],
      email_logs: emailRes.rows || [],
      linked_order: linkedOrder,
      linked_cart: linkedCart,
    })
  } catch (error: any) {
    console.error("[Admin Order Monitoring Detail Error]:", error)
    res.status(500).json({
      message: "Failed to fetch incident details",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as Record<string, any>) || {}

    const incRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_incident WHERE id = ?;`,
      [id]
    )
    const current = incRes.rows?.[0]
    if (!current) {
      return res.status(404).json({ message: `Incident '${id}' not found` })
    }

    const newStatus = body.status || current.status
    const adminNotes = body.admin_notes !== undefined ? body.admin_notes : current.admin_notes
    const adminUser = (req as any).auth_context?.actor_id || "admin@academyio.com"

    const isResolving = ["resolved", "false_positive"].includes(newStatus) && !["resolved", "false_positive"].includes(current.status)

    await pgConnection.raw(
      `UPDATE order_monitoring_incident
       SET status = ?,
           admin_notes = ?,
           resolved_at = CASE WHEN ? THEN now() ELSE resolved_at END,
           resolved_by = CASE WHEN ? THEN ? ELSE resolved_by END,
           updated_at = now()
       WHERE id = ?;`,
      [newStatus, adminNotes, isResolving, isResolving, adminUser, id]
    )

    // Audit log
    const auditId = `omal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    await pgConnection.raw(
      `INSERT INTO order_monitoring_audit_log (
        id, incident_id, admin_user_id, admin_email, action, previous_status, new_status, notes, created_at
      ) VALUES (?, ?, 'ADMIN', ?, 'status_change', ?, ?, ?, now());`,
      [
        auditId,
        id,
        adminUser,
        current.status,
        newStatus,
        body.action_note || `Status updated from ${current.status} to ${newStatus}`,
      ]
    )

    res.json({
      success: true,
      message: `Incident ${id} updated to status '${newStatus}'`,
      incident_id: id,
      status: newStatus,
    })
  } catch (error: any) {
    console.error("[Admin Order Monitoring Update Error]:", error)
    res.status(500).json({
      message: "Failed to update incident",
      error: error.message,
    })
  }
}
