import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Check global master switch
    const settingsRes = await pgConnection.raw(`
      SELECT * FROM homepage_section_settings WHERE section_key = 'other_info';
    `)
    const settings = settingsRes.rows?.[0] || {
      section_key: "other_info",
      is_enabled: true,
      title: "Continuing Education Standards & Compliance Disclosures",
      subtitle: "Important Program Guidelines",
      description: "Essential regulatory details regarding attendance tracking, certificate delivery, and multi-state board reciprocity.",
    }

    if (!settings.is_enabled) {
      return res.json({
        global_enabled: false,
        items: [],
        count: 0,
        settings,
      })
    }

    const itemsRes = await pgConnection.raw(`
      SELECT 
        id,
        title,
        description,
        icon,
        image_url,
        link_url,
        link_text,
        badge,
        section,
        display_order
      FROM other_information_item
      WHERE deleted_at IS NULL 
        AND is_active = true 
        AND show_on_homepage = true
      ORDER BY display_order ASC, created_at ASC;
    `)

    res.json({
      global_enabled: true,
      items: itemsRes.rows || [],
      count: (itemsRes.rows || []).length,
      settings,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch store information items",
      error: error.message,
    })
  }
}
