import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const creditsRes = await pgConnection.raw(`
      SELECT 
        c.id,
        c.code,
        c.name,
        c.badge,
        c.description,
        c.category,
        c.default_credit_hours,
        c.organization_code,
        c.icon,
        c.is_active,
        c.show_on_homepage,
        c.show_on_webinars,
        c.display_order,
        c.created_at,
        c.updated_at,
        o.name as organization_name,
        o.short_name as organization_short_name,
        o.logo_url as organization_logo_url
      FROM credit_type c
      LEFT JOIN accreditation_organization o ON c.organization_code = o.code AND o.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      ORDER BY c.display_order ASC, c.name ASC;
    `)

    // Fetch section settings
    const settingsRes = await pgConnection.raw(`
      SELECT * FROM homepage_section_settings WHERE section_key = 'credits';
    `)
    const settings = settingsRes.rows?.[0] || {
      section_key: "credits",
      is_enabled: true,
      title: "Earn Certified Continuing Professional Education Credits",
      subtitle: "Accredited Professional Credentials",
      description: "AcademyIO masterclasses qualify for nationally recognized professional credentials across accounting, taxation, and human resources.",
    }

    // Available organizations for dropdown assignment
    const orgsRes = await pgConnection.raw(`
      SELECT code, name, short_name, logo_url FROM accreditation_organization WHERE deleted_at IS NULL ORDER BY name ASC;
    `)

    res.json({
      credit_types: creditsRes.rows || [],
      count: (creditsRes.rows || []).length,
      settings,
      available_organizations: orgsRes.rows || [],
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch credit types",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as Record<string, any>

    const name = body.name ? String(body.name).trim() : ""
    const category = body.category ? String(body.category).trim() : "Accounting & Finance"
    let code = body.code ? String(body.code).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : ""
    if (!code && name) {
      code = name.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 30)
    }

    if (!name || !code) {
      return res.status(400).json({ message: "Credit name and code are required." })
    }

    // Check code uniqueness
    const existing = await pgConnection.raw(`
      SELECT id, deleted_at FROM credit_type WHERE code = ?;
    `, [code])

    if (existing.rows && existing.rows.length > 0) {
      const row = existing.rows[0]
      if (row.deleted_at === null) {
        return res.status(409).json({ message: `A credit type with code "${code}" already exists.` })
      } else {
        // Reactivate soft-deleted credit type
        const updateRes = await pgConnection.raw(`
          UPDATE credit_type SET
            name = ?,
            badge = ?,
            description = ?,
            category = ?,
            default_credit_hours = ?,
            organization_code = ?,
            icon = ?,
            is_active = ?,
            show_on_homepage = ?,
            show_on_webinars = ?,
            display_order = ?,
            deleted_at = NULL,
            updated_at = now()
          WHERE id = ?
          RETURNING *;
        `, [
          name,
          body.badge?.trim() || null,
          body.description?.trim() || "",
          category,
          body.default_credit_hours?.trim() || "1.0 - 2.0 Credits",
          body.organization_code?.trim() || null,
          body.icon?.trim() || "award",
          body.is_active !== undefined ? Boolean(body.is_active) : true,
          body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : true,
          body.show_on_webinars !== undefined ? Boolean(body.show_on_webinars) : true,
          parseInt(body.display_order) || 0,
          row.id,
        ])
        return res.status(201).json({
          credit_type: updateRes.rows[0],
          message: "Credit type restored and updated successfully.",
        })
      }
    }

    const id = `ct_${code}_${Date.now().toString(36)}`
    const badge = body.badge?.trim() || null
    const description = body.description?.trim() || ""
    const default_credit_hours = body.default_credit_hours?.trim() || "1.0 - 2.0 Credits"
    const organization_code = body.organization_code?.trim() || null
    const icon = body.icon?.trim() || "award"
    const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true
    const show_on_homepage = body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : true
    const show_on_webinars = body.show_on_webinars !== undefined ? Boolean(body.show_on_webinars) : true
    const display_order = parseInt(body.display_order) || 0

    const insertRes = await pgConnection.raw(`
      INSERT INTO credit_type (
        id, code, name, badge, description, category, default_credit_hours,
        organization_code, icon, is_active, show_on_homepage, show_on_webinars,
        display_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
      RETURNING *;
    `, [
      id, code, name, badge, description, category, default_credit_hours,
      organization_code, icon, is_active, show_on_homepage, show_on_webinars, display_order,
    ])

    res.status(201).json({
      credit_type: insertRes.rows[0],
      message: "Credit type created successfully.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create credit type",
      error: error.message,
    })
  }
}
