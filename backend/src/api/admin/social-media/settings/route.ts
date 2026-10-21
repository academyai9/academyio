import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as Record<string, any>

    const is_enabled = body.is_enabled !== undefined ? Boolean(body.is_enabled) : true
    const title = body.title !== undefined ? String(body.title).trim() : null
    const subtitle = body.subtitle !== undefined ? String(body.subtitle).trim() : null
    const description = body.description !== undefined ? String(body.description).trim() : null

    const result = await pgConnection.raw(`
      INSERT INTO homepage_section_settings (section_key, is_enabled, title, subtitle, description, updated_at)
      VALUES ('social_media', ?, ?, ?, ?, now())
      ON CONFLICT (section_key) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        title = COALESCE(EXCLUDED.title, homepage_section_settings.title),
        subtitle = COALESCE(EXCLUDED.subtitle, homepage_section_settings.subtitle),
        description = COALESCE(EXCLUDED.description, homepage_section_settings.description),
        updated_at = now()
      RETURNING *;
    `, [is_enabled, title, subtitle, description])

    res.json({
      settings: result.rows[0],
      message: `Follow Us On section global visibility ${is_enabled ? "enabled" : "disabled"}.`,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update social media settings",
      error: error.message,
    })
  }
}
