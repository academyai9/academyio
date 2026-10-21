import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureTrackingCodesTables,
  validateTrackingCode,
  TrackingCodeRecord,
} from "../../../../utils/tracking-codes-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params as { id: string }
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    await ensureTrackingCodesTables(pgConnection)

    const result = await pgConnection.raw(
      `SELECT * FROM frontend_tracking_codes WHERE id = ? LIMIT 1;`,
      [id]
    )

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: `Tracking code with ID ${id} not found.` })
    }

    const logsResult = await pgConnection.raw(
      `SELECT * FROM tracking_code_audit_logs WHERE tracking_code_id = ? ORDER BY created_at DESC LIMIT 20;`,
      [id]
    )

    return res.json({
      tracking_code: result.rows[0],
      audit_logs: logsResult.rows || [],
    })
  } catch (error: any) {
    console.error("Error fetching tracking code:", error)
    return res.status(500).json({
      message: "Failed to fetch tracking code",
      error: error.message,
    })
  }
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params as { id: string }
  const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    await ensureTrackingCodesTables(pgConnection)

    // Check existing
    const existingRes = await pgConnection.raw(
      `SELECT * FROM frontend_tracking_codes WHERE id = ? LIMIT 1;`,
      [id]
    )

    if (!existingRes.rows || existingRes.rows.length === 0) {
      return res.status(404).json({ message: `Tracking code with ID ${id} not found.` })
    }

    const existing: TrackingCodeRecord = existingRes.rows[0]
    const body = req.body as Partial<TrackingCodeRecord>

    const validation = validateTrackingCode({
      name: body.name || existing.name,
      type: body.type || existing.type,
      tracking_id: body.tracking_id !== undefined ? body.tracking_id : existing.tracking_id,
      custom_code: body.custom_code !== undefined ? body.custom_code : existing.custom_code,
      placement: body.placement || existing.placement,
      target_pages: body.target_pages || existing.target_pages,
    })

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error })
    }

    const name = body.name ? String(body.name).trim() : existing.name
    const type = body.type ? String(body.type).trim() : existing.type
    const tracking_id =
      body.tracking_id !== undefined ? (body.tracking_id ? String(body.tracking_id).trim() : null) : existing.tracking_id
    const custom_code =
      body.custom_code !== undefined ? (body.custom_code ? String(body.custom_code).trim() : null) : existing.custom_code
    const placement = body.placement || existing.placement
    const target_pages = body.target_pages || existing.target_pages
    const target_paths =
      body.target_paths !== undefined
        ? Array.isArray(body.target_paths)
          ? body.target_paths
          : []
        : existing.target_paths
    const is_enabled = body.is_enabled !== undefined ? Boolean(body.is_enabled) : existing.is_enabled
    const description =
      body.description !== undefined ? (body.description ? String(body.description).trim() : null) : existing.description
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const updateRes = await pgConnection.raw(
      `UPDATE frontend_tracking_codes SET
        name = ?,
        type = ?,
        tracking_id = ?,
        custom_code = ?,
        placement = ?,
        target_pages = ?,
        target_paths = ?::jsonb,
        is_enabled = ?,
        description = ?,
        last_updated_by = ?,
        updated_at = NOW()
      WHERE id = ?
      RETURNING *;`,
      [
        name,
        type,
        tracking_id,
        custom_code,
        placement,
        target_pages,
        JSON.stringify(target_paths),
        is_enabled,
        description,
        adminUser,
        id,
      ]
    )

    // Record audit log
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    await pgConnection.raw(
      `INSERT INTO tracking_code_audit_logs (
        id, tracking_code_id, action, changed_by, changes, ip_address, created_at
      ) VALUES (?, ?, 'update', ?, ?::jsonb, ?, NOW());`,
      [
        auditId,
        id,
        adminUser,
        JSON.stringify({
          previous: { name: existing.name, is_enabled: existing.is_enabled, tracking_id: existing.tracking_id },
          updated: { name, is_enabled, tracking_id, placement, target_pages },
        }),
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
      ]
    )

    return res.json({
      tracking_code: updateRes.rows[0],
      message: `Tracking code "${name}" updated successfully.`,
    })
  } catch (error: any) {
    console.error("Error updating tracking code:", error)
    return res.status(500).json({
      message: "Failed to update tracking code",
      error: error.message,
    })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
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

    const existing = existingRes.rows[0]
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    await pgConnection.raw(`DELETE FROM frontend_tracking_codes WHERE id = ?;`, [id])

    // Record audit log
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    await pgConnection.raw(
      `INSERT INTO tracking_code_audit_logs (
        id, tracking_code_id, action, changed_by, changes, ip_address, created_at
      ) VALUES (?, ?, 'delete', ?, ?::jsonb, ?, NOW());`,
      [
        auditId,
        id,
        adminUser,
        JSON.stringify({ name: existing.name, type: existing.type, tracking_id: existing.tracking_id }),
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
      ]
    )

    return res.json({
      message: `Tracking code "${existing.name}" deleted successfully.`,
      deleted_id: id,
    })
  } catch (error: any) {
    console.error("Error deleting tracking code:", error)
    return res.status(500).json({
      message: "Failed to delete tracking code",
      error: error.message,
    })
  }
}
