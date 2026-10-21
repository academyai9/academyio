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
    const { id } = req.params

    const result = await pgConnection.raw(`
      SELECT * FROM social_media_link WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Social media link not found" })
    }

    res.json({ social_link: result.rows[0] })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch social media link", error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as Record<string, any>

    const existing = await pgConnection.raw(`
      SELECT * FROM social_media_link WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Social media link not found" })
    }

    const current = existing.rows[0]

    let updatedUrl = current.url
    if (body.url !== undefined) {
      const trimmedUrl = String(body.url).trim()
      if (!isValidHttpUrl(trimmedUrl)) {
        return res.status(400).json({ message: "Invalid URL. URL must start with http:// or https://" })
      }
      updatedUrl = trimmedUrl
    }

    const updatedName = body.name !== undefined ? String(body.name).trim() : current.name
    const updatedPlatform = body.platform !== undefined ? String(body.platform).trim().toLowerCase() : current.platform
    const updatedIcon = body.icon !== undefined ? String(body.icon).trim().toLowerCase() : current.icon
    const updatedCustomIcon = body.custom_icon_url !== undefined ? (body.custom_icon_url ? String(body.custom_icon_url).trim() : null) : current.custom_icon_url
    const updatedLabel = body.label !== undefined ? (body.label ? String(body.label).trim() : null) : current.label
    const updatedActive = body.is_active !== undefined ? Boolean(body.is_active) : current.is_active
    const updatedOrder = body.display_order !== undefined ? parseInt(body.display_order) || 0 : current.display_order
    const updatedOpenNewTab = body.open_in_new_tab !== undefined ? Boolean(body.open_in_new_tab) : current.open_in_new_tab

    const updateRes = await pgConnection.raw(`
      UPDATE social_media_link SET
        name = ?,
        platform = ?,
        url = ?,
        icon = ?,
        custom_icon_url = ?,
        label = ?,
        is_active = ?,
        display_order = ?,
        open_in_new_tab = ?,
        updated_at = now()
      WHERE id = ?
      RETURNING *;
    `, [
      updatedName,
      updatedPlatform,
      updatedUrl,
      updatedIcon,
      updatedCustomIcon,
      updatedLabel,
      updatedActive,
      updatedOrder,
      updatedOpenNewTab,
      current.id,
    ])

    res.json({
      social_link: updateRes.rows[0],
      message: "Social media platform updated successfully.",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update social media platform", error: error.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const existing = await pgConnection.raw(`
      SELECT * FROM social_media_link WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Social media link not found" })
    }

    const current = existing.rows[0]

    await pgConnection.raw(`
      UPDATE social_media_link SET
        deleted_at = now(),
        updated_at = now()
      WHERE id = ?;
    `, [current.id])

    res.json({
      success: true,
      message: `Social media platform "${current.name}" deleted successfully.`,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete social media link", error: error.message })
  }
}
