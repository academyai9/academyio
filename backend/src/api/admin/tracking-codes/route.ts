import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  ensureTrackingCodesTables,
  validateTrackingCode,
  TrackingCodeRecord,
} from "../../../utils/tracking-codes-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureTrackingCodesTables(pgConnection)

    const query = req.query as Record<string, any>
    const search = query.search ? String(query.search).trim() : ""
    const typeFilter = query.type ? String(query.type).trim() : ""
    const statusFilter = query.status ? String(query.status).trim() : ""
    const placementFilter = query.placement ? String(query.placement).trim() : ""

    let sql = `SELECT * FROM frontend_tracking_codes WHERE 1=1`
    const params: any[] = []

    if (search) {
      sql += ` AND (name ILIKE ? OR tracking_id ILIKE ? OR description ILIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (typeFilter && typeFilter !== "all") {
      sql += ` AND type = ?`
      params.push(typeFilter)
    }

    if (statusFilter && statusFilter !== "all") {
      sql += ` AND is_enabled = ?`
      params.push(statusFilter === "enabled")
    }

    if (placementFilter && placementFilter !== "all") {
      sql += ` AND placement = ?`
      params.push(placementFilter)
    }

    sql += ` ORDER BY updated_at DESC;`

    const result = await pgConnection.raw(sql, params)
    const items: TrackingCodeRecord[] = result.rows || []

    // Calculate summary statistics
    const statsRes = await pgConnection.raw(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_enabled = true) as enabled_count,
        COUNT(*) FILTER (WHERE is_enabled = false) as disabled_count,
        COUNT(*) FILTER (WHERE type = 'ga4') as ga4_count,
        COUNT(*) FILTER (WHERE type = 'gtm') as gtm_count,
        COUNT(*) FILTER (WHERE type = 'meta_pixel') as meta_count,
        COUNT(*) FILTER (WHERE type = 'custom') as custom_count
      FROM frontend_tracking_codes;
    `)
    const stats = statsRes.rows?.[0] || {
      total: 0,
      enabled_count: 0,
      disabled_count: 0,
      ga4_count: 0,
      gtm_count: 0,
      meta_count: 0,
      custom_count: 0,
    }

    return res.json({
      tracking_codes: items,
      count: items.length,
      stats: {
        total: parseInt(stats.total) || 0,
        enabled_count: parseInt(stats.enabled_count) || 0,
        disabled_count: parseInt(stats.disabled_count) || 0,
        ga4_count: parseInt(stats.ga4_count) || 0,
        gtm_count: parseInt(stats.gtm_count) || 0,
        meta_count: parseInt(stats.meta_count) || 0,
        custom_count: parseInt(stats.custom_count) || 0,
      },
    })
  } catch (error: any) {
    console.error("Error fetching admin tracking codes:", error)
    return res.status(500).json({
      message: "Failed to fetch tracking codes",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureTrackingCodesTables(pgConnection)

    const body = req.body as Partial<TrackingCodeRecord> & { client_ip?: string }

    const validation = validateTrackingCode({
      name: body.name,
      type: body.type,
      tracking_id: body.tracking_id,
      custom_code: body.custom_code,
      placement: body.placement,
      target_pages: body.target_pages,
    })

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error })
    }

    const id = `tc_${body.type}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    const name = String(body.name).trim()
    const type = String(body.type).trim()
    const tracking_id = body.tracking_id ? String(body.tracking_id).trim() : null
    const custom_code = body.custom_code ? String(body.custom_code).trim() : null
    const placement = body.placement || "head"
    const target_pages = body.target_pages || "all"
    const target_paths = body.target_paths && Array.isArray(body.target_paths) ? body.target_paths : []
    const is_enabled = body.is_enabled !== undefined ? Boolean(body.is_enabled) : true
    const description = body.description ? String(body.description).trim() : null
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const insertRes = await pgConnection.raw(
      `INSERT INTO frontend_tracking_codes (
        id, name, type, tracking_id, custom_code, placement, target_pages, target_paths,
        is_enabled, description, created_by, last_updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, NOW(), NOW())
      RETURNING *;`,
      [
        id,
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
        adminUser,
      ]
    )

    // Record audit log
    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    await pgConnection.raw(
      `INSERT INTO tracking_code_audit_logs (
        id, tracking_code_id, action, changed_by, changes, ip_address, created_at
      ) VALUES (?, ?, 'create', ?, ?::jsonb, ?, NOW());`,
      [
        auditId,
        id,
        adminUser,
        JSON.stringify({ name, type, tracking_id, placement, target_pages, is_enabled }),
        req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
      ]
    )

    return res.status(201).json({
      tracking_code: insertRes.rows[0],
      message: `Tracking code "${name}" created successfully.`,
    })
  } catch (error: any) {
    console.error("Error creating tracking code:", error)
    return res.status(500).json({
      message: "Failed to create tracking code",
      error: error.message,
    })
  }
}
