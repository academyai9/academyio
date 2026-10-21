import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
    const { id } = req.params

    const result = await pgConnection.raw(`
      SELECT * FROM other_information_item WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Information item not found" })
    }

    res.json({ item: result.rows[0] })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch information item", error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as Record<string, any>

    const existing = await pgConnection.raw(`
      SELECT * FROM other_information_item WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Information item not found" })
    }

    const current = existing.rows[0]

    const updatedTitle = body.title !== undefined ? String(body.title).trim() : current.title
    const updatedDescription = body.description !== undefined ? sanitizeHtmlContent(String(body.description).trim()) : current.description
    const updatedIcon = body.icon !== undefined ? String(body.icon).trim() : current.icon
    const updatedImage = body.image_url !== undefined ? (body.image_url ? String(body.image_url).trim() : null) : current.image_url
    const updatedLinkUrl = body.link_url !== undefined ? (body.link_url ? String(body.link_url).trim() : null) : current.link_url
    const updatedLinkText = body.link_text !== undefined ? (body.link_text ? String(body.link_text).trim() : null) : current.link_text
    const updatedBadge = body.badge !== undefined ? (body.badge ? String(body.badge).trim() : null) : current.badge
    const updatedSection = body.section !== undefined ? String(body.section).trim() : current.section
    const updatedActive = body.is_active !== undefined ? Boolean(body.is_active) : current.is_active
    const updatedHomepage = body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : current.show_on_homepage
    const updatedOrder = body.display_order !== undefined ? parseInt(body.display_order) || 0 : current.display_order

    const updateRes = await pgConnection.raw(`
      UPDATE other_information_item SET
        title = ?,
        description = ?,
        icon = ?,
        image_url = ?,
        link_url = ?,
        link_text = ?,
        badge = ?,
        section = ?,
        is_active = ?,
        show_on_homepage = ?,
        display_order = ?,
        updated_at = now()
      WHERE id = ?
      RETURNING *;
    `, [
      updatedTitle,
      updatedDescription,
      updatedIcon,
      updatedImage,
      updatedLinkUrl,
      updatedLinkText,
      updatedBadge,
      updatedSection,
      updatedActive,
      updatedHomepage,
      updatedOrder,
      current.id,
    ])

    res.json({
      item: updateRes.rows[0],
      message: "Information item updated successfully.",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update information item", error: error.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const existing = await pgConnection.raw(`
      SELECT * FROM other_information_item WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Information item not found" })
    }

    const current = existing.rows[0]

    await pgConnection.raw(`
      UPDATE other_information_item SET
        deleted_at = now(),
        updated_at = now()
      WHERE id = ?;
    `, [current.id])

    res.json({
      success: true,
      message: `Information item "${current.title}" deleted successfully.`,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete information item", error: error.message })
  }
}
