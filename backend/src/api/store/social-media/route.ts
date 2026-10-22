import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Check global master switch
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

    if (!settings.is_enabled) {
      return res.json({
        global_enabled: false,
        social_links: [],
        count: 0,
        settings,
      })
    }

    const linksRes = await pgConnection.raw(`
      SELECT 
        id,
        platform,
        name,
        url,
        icon,
        custom_icon_url,
        label,
        open_in_new_tab,
        display_order
      FROM social_media_link
      WHERE deleted_at IS NULL 
        AND is_active = true 
        AND url IS NOT NULL 
        AND url != ''
      ORDER BY display_order ASC, created_at ASC;
    `)

    // Deduplicate in case any redundant records exist
    const rawLinks = linksRes.rows || []
    const seen = new Set<string>()
    const deduplicatedLinks = rawLinks.filter((link: any) => {
      const key = (link.id || `${link.platform}-${link.url}`).toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    res.json({
      global_enabled: true,
      social_links: deduplicatedLinks,
      count: deduplicatedLinks.length,
      settings,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch store social media links",
      error: error.message,
    })
  }
}
