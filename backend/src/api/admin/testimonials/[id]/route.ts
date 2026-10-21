import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const result = await pgConnection.raw(`
      SELECT * FROM testimonial WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Testimonial not found" })
    }

    res.json({ testimonial: result.rows[0] })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch testimonial", error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as Record<string, any>

    // Check existing
    const existing = await pgConnection.raw(`
      SELECT * FROM testimonial WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Testimonial not found" })
    }

    const current = existing.rows[0]

    const updatedName = body.customer_name !== undefined ? body.customer_name.trim() : current.customer_name
    const updatedDesignation = body.designation !== undefined ? body.designation.trim() : current.designation
    const updatedCompany = body.company !== undefined ? (body.company ? body.company.trim() : null) : current.company
    const updatedAvatar = body.avatar_url !== undefined ? (body.avatar_url ? body.avatar_url.trim() : null) : current.avatar_url
    const updatedContent = body.content !== undefined ? body.content.trim() : current.content
    const updatedRating = body.rating !== undefined ? Math.min(5, Math.max(1, parseInt(body.rating) || 5)) : current.rating
    const updatedPublished = body.is_published !== undefined ? Boolean(body.is_published) : current.is_published
    const updatedFeatured = body.featured_homepage !== undefined ? Boolean(body.featured_homepage) : current.featured_homepage
    const updatedOrder = body.display_order !== undefined ? parseInt(body.display_order) || 0 : current.display_order

    const updateRes = await pgConnection.raw(`
      UPDATE testimonial SET
        customer_name = ?,
        designation = ?,
        company = ?,
        avatar_url = ?,
        content = ?,
        rating = ?,
        is_published = ?,
        featured_homepage = ?,
        display_order = ?,
        updated_at = now()
      WHERE id = ?
      RETURNING *;
    `, [
      updatedName,
      updatedDesignation,
      updatedCompany,
      updatedAvatar,
      updatedContent,
      updatedRating,
      updatedPublished,
      updatedFeatured,
      updatedOrder,
      id,
    ])

    res.json({
      testimonial: updateRes.rows[0],
      message: "Testimonial updated successfully",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update testimonial", error: error.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const existing = await pgConnection.raw(`
      SELECT * FROM testimonial WHERE id = ? AND deleted_at IS NULL;
    `, [id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Testimonial not found" })
    }

    await pgConnection.raw(`
      UPDATE testimonial SET deleted_at = now() WHERE id = ?;
    `, [id])

    res.json({
      id,
      message: "Testimonial deleted successfully",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete testimonial", error: error.message })
  }
}
