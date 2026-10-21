import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Check global master switch
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

    if (!settings.is_enabled) {
      return res.json({
        global_enabled: false,
        credit_types: [],
        count: 0,
        settings,
      })
    }

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
        c.display_order,
        o.name as organization_name,
        o.short_name as organization_short_name,
        o.logo_url as organization_logo_url
      FROM credit_type c
      LEFT JOIN accreditation_organization o ON c.organization_code = o.code AND o.deleted_at IS NULL
      WHERE c.deleted_at IS NULL 
        AND c.is_active = true 
        AND c.show_on_homepage = true
      ORDER BY c.display_order ASC, c.name ASC;
    `)

    res.json({
      global_enabled: true,
      credit_types: creditsRes.rows || [],
      count: (creditsRes.rows || []).length,
      settings,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch store credit types",
      error: error.message,
    })
  }
}
