import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function isValidHttpUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch (_) {
    return false
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const linksRes = await pgConnection.raw(`
      SELECT 
        id,
        platform,
        name,
        url,
        icon,
        custom_icon_url,
        label,
        is_active,
        display_order,
        open_in_new_tab,
        created_at,
        updated_at
      FROM social_media_link
      WHERE deleted_at IS NULL
      ORDER BY display_order ASC, created_at ASC;
    `)

    // Fetch section settings
    const settingsRes = await pgConnection.raw(`
      SELECT * FROM homepage_section_settings WHERE section_key = 'social_media';
    `)
    const settings = settingsRes.rows?.[0] || {
      section_key: "social_media",
      is_enabled: true,
      title: "Follow Us On",
      subtitle: "Stay Connected with AcademyIO",
      description: "Follow our official channels for the latest webinar announcements, CPE updates, and tax law analysis.",
    }

    res.json({
      social_links: linksRes.rows || [],
      count: (linksRes.rows || []).length,
      settings,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch social media links",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as Record<string, any>

    const name = body.name ? String(body.name).trim() : ""
    const platform = body.platform ? String(body.platform).trim().toLowerCase() : "custom"
    const url = body.url ? String(body.url).trim() : ""

    if (!name || !url) {
      return res.status(400).json({ message: "Platform Name and Profile URL are required." })
    }

    if (!isValidHttpUrl(url)) {
      return res.status(400).json({ message: "Invalid URL. URL must start with http:// or https://" })
    }

    const id = `soc_${platform}_${Date.now().toString(36)}`
    const icon = body.icon ? String(body.icon).trim().toLowerCase() : platform
    const custom_icon_url = body.custom_icon_url ? String(body.custom_icon_url).trim() : null
    const label = body.label ? String(body.label).trim() : null
    const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true
    const display_order = parseInt(body.display_order) || 0
    const open_in_new_tab = body.open_in_new_tab !== undefined ? Boolean(body.open_in_new_tab) : true

    const insertRes = await pgConnection.raw(`
      INSERT INTO social_media_link (
        id, platform, name, url, icon, custom_icon_url, label,
        is_active, display_order, open_in_new_tab, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
      RETURNING *;
    `, [
      id, platform, name, url, icon, custom_icon_url, label,
      is_active, display_order, open_in_new_tab,
    ])

    res.status(201).json({
      social_link: insertRes.rows[0],
      message: "Social media platform added successfully.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create social media platform",
      error: error.message,
    })
  }
}
