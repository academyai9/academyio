import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureTrackingCodesTables } from "../../../../../utils/tracking-codes-db"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params as { id: string }
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    await ensureTrackingCodesTables(pgConnection)

    const existingRes = await pgConnection.raw(
      `SELECT * FROM frontend_tracking_codes WHERE id = ? LIMIT 1;`,
      [id]
    )

    if (!existingRes.rows || existingRes.rows.length === 0) {
      return res.status(404).json({ message: `Tracking code with ID ${id} not found.` })
    }

    const current = existingRes.rows[0]
    const nextState = !current.is_enabled
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const updateRes = await pgConnection.raw(
      `UPDATE frontend_tracking_codes SET
        is_enabled = ?,
        last_updated_by = ?,
        updated_at = NOW()
      WHERE id = ?
      RETURNING *;`,
      [nextState, adminUser, id]
    )

    // Record audit log
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    await pgConnection.raw(
      `INSERT INTO tracking_code_audit_logs (
        id, tracking_code_id, action, changed_by, changes, ip_address, created_at
      ) VALUES (?, ?, 'toggle', ?, ?::jsonb, ?, NOW());`,
      [
        auditId,
        id,
        adminUser,
        JSON.stringify({ is_enabled: nextState, previous_state: current.is_enabled }),
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
      ]
    )

    return res.json({
      tracking_code: updateRes.rows[0],
      message: `Tracking code "${current.name}" ${nextState ? "enabled" : "disabled"} successfully.`,
    })
  } catch (error: any) {
    console.error("Error toggling tracking code:", error)
    return res.status(500).json({
      message: "Failed to toggle tracking code",
      error: error.message,
    })
  }
}
