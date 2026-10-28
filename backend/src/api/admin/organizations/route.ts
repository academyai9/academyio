import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const orgsRes = await pgConnection.raw(`
      SELECT 
        o.id,
        o.code,
        o.name,
        o.short_name,
        o.logo_url,
        o.website_url,
        o.alt_text,
        o.description,
        o.default_credit_type,
        o.is_enabled,
        o.show_on_homepage,
        o.display_order,
        o.created_at,
        o.updated_at
      FROM accreditation_organization o
      WHERE o.deleted_at IS NULL
      ORDER BY o.display_order ASC, o.name ASC;
    `)

    // Section settings
    const settingsRes = await pgConnection.raw(`
      SELECT * FROM homepage_section_settings WHERE section_key = 'regulatory_bodies';
    `)
    const settings = settingsRes.rows?.[0] || {
      section_key: "regulatory_bodies",
      is_enabled: true,
      title: "Recognized by Leading Professional Regulatory Bodies",
      subtitle: "Accredited Continuing Professional Education",
      description: "Our course curricula and faculty masterclasses are designed in strict alignment with national continuing education standards.",
    }

    // Webinar count assigned to each organization
    const creditsRes = await pgConnection.raw(`
      SELECT organizations FROM webinar_credit_info WHERE deleted_at IS NULL;
    `)

    const orgCounts: Record<string, number> = {}
    for (const row of creditsRes.rows || []) {
      if (Array.isArray(row.organizations)) {
        for (const assigned of row.organizations) {
          if (assigned.org_code) {
            orgCounts[assigned.org_code] = (orgCounts[assigned.org_code] || 0) + 1
          }
        }
      }
    }

    const organizations = (orgsRes.rows || []).map((org: any) => ({
      ...org,
      assigned_webinars_count: orgCounts[org.code] || 0,
    }))

    res.json({
      organizations,
      count: organizations.length,
      settings,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch admin organizations",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as Record<string, any>

    const name = body.name ? body.name.trim() : ""
    const short_name = body.short_name ? body.short_name.trim() : ""
    let code = body.code ? body.code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : ""
    if (!code && short_name) {
      code = short_name.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    }

    if (!name || !short_name || !code) {
      return res.status(400).json({ message: "Name, short name, and code are required." })
    }

    // Check code uniqueness
    const existing = await pgConnection.raw(`
      SELECT id, deleted_at FROM accreditation_organization WHERE code = ?;
    `, [code])

    if (existing.rows && existing.rows.length > 0) {
      const row = existing.rows[0]
      if (row.deleted_at === null) {
        return res.status(409).json({ message: `An organization with code "${code}" already exists.` })
      } else {
        // Reactivate soft-deleted organization
        const id = row.id
        const updateRes = await pgConnection.raw(`
          UPDATE accreditation_organization SET
            name = ?,
            short_name = ?,
            logo_url = ?,
            website_url = ?,
            alt_text = ?,
            description = ?,
            default_credit_type = ?,
            is_enabled = ?,
            show_on_homepage = ?,
            display_order = ?,
            deleted_at = NULL,
            updated_at = now()
          WHERE id = ?
          RETURNING *;
        `, [
          name,
          short_name,
          body.logo_url?.trim() || "/logos/nasba.png",
          body.website_url ? body.website_url.trim() : null,
          body.alt_text?.trim() || `${short_name} Accreditation`,
          body.description?.trim() || "",
          body.default_credit_type?.trim() || "CPE Credits",
          body.is_enabled !== undefined ? Boolean(body.is_enabled) : true,
          body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : true,
          parseInt(body.display_order) || 0,
          id,
        ])
        return res.status(201).json({
          organization: updateRes.rows[0],
          message: "Organization restored and updated successfully.",
        })
      }
    }

    const id = `org_${code}_${Date.now().toString(36)}`
    const logo_url = body.logo_url?.trim() || "/logos/nasba.png"
    const website_url = body.website_url ? body.website_url.trim() : null
    const alt_text = body.alt_text?.trim() || `${short_name} Accreditation`
    const description = body.description?.trim() || ""
    const default_credit_type = body.default_credit_type?.trim() || "CPE Credits"
    const is_enabled = body.is_enabled !== undefined ? Boolean(body.is_enabled) : true
    const show_on_homepage = body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : true
    const display_order = parseInt(body.display_order) || 0

    const insertRes = await pgConnection.raw(`
      INSERT INTO accreditation_organization (
        id, code, name, short_name, logo_url, website_url, alt_text, description,
        default_credit_type, is_enabled, show_on_homepage, display_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
      RETURNING *;
    `, [
      id, code, name, short_name, logo_url, website_url, alt_text, description,
      default_credit_type, is_enabled, show_on_homepage, display_order,
    ])

    res.status(201).json({
      organization: insertRes.rows[0],
      message: "Regulatory body created successfully.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create regulatory body",
      error: error.message,
    })
  }
}
