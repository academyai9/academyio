import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Check global master switch
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

    if (!settings.is_enabled) {
      return res.json({
        global_enabled: false,
        organizations: [],
        count: 0,
        settings,
      })
    }

    const result = await pgConnection.raw(`
      SELECT 
        id,
        code,
        name,
        short_name,
        logo_url,
        website_url,
        alt_text,
        description,
        default_credit_type,
        display_order
      FROM accreditation_organization
      WHERE deleted_at IS NULL 
        AND is_enabled = true 
        AND show_on_homepage = true
      ORDER BY display_order ASC, name ASC;
    `)

    res.json({
      global_enabled: true,
      organizations: result.rows || [],
      count: (result.rows || []).length,
      settings,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch accreditation organizations",
      error: error.message,
    })
  }
}
