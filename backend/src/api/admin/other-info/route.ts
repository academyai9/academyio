import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Lightweight XSS sanitizer for rich text / html descriptions
function sanitizeHtmlContent(html: string): string {
  if (!html) return ""
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:[^"']*/gi, "")
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

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
        is_active,
        show_on_homepage,
        display_order,
        created_at,
        updated_at
      FROM other_information_item
      WHERE deleted_at IS NULL
      ORDER BY display_order ASC, created_at ASC;
    `)

    // Fetch section settings
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

    res.json({
      items: itemsRes.rows || [],
      count: (itemsRes.rows || []).length,
      settings,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch other information items",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as Record<string, any>

    const title = body.title ? String(body.title).trim() : ""
    const rawDescription = body.description ? String(body.description).trim() : ""
    const description = sanitizeHtmlContent(rawDescription)

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." })
    }

    const id = `info_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    const icon = body.icon ? String(body.icon).trim() : "info"
    const image_url = body.image_url ? String(body.image_url).trim() : null
    const link_url = body.link_url ? String(body.link_url).trim() : null
    const link_text = body.link_text ? String(body.link_text).trim() : null
    const badge = body.badge ? String(body.badge).trim() : null
    const section = body.section ? String(body.section).trim() : "homepage"
    const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true
    const show_on_homepage = body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : true
    const display_order = parseInt(body.display_order) || 0

    const insertRes = await pgConnection.raw(`
      INSERT INTO other_information_item (
        id, title, description, icon, image_url, link_url, link_text, badge,
        section, is_active, show_on_homepage, display_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
      RETURNING *;
    `, [
      id, title, description, icon, image_url, link_url, link_text, badge,
      section, is_active, show_on_homepage, display_order,
    ])

    res.status(201).json({
      item: insertRes.rows[0],
      message: "Information item created successfully.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create information item",
      error: error.message,
    })
  }
}
