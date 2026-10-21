import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const result = await pgConnection.raw(`
      SELECT * FROM credit_type WHERE (id = ? OR code = ?) AND deleted_at IS NULL;
    `, [id, id])

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Credit type not found" })
    }

    res.json({ credit_type: result.rows[0] })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch credit type", error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as Record<string, any>

    const existing = await pgConnection.raw(`
      SELECT * FROM credit_type WHERE (id = ? OR code = ?) AND deleted_at IS NULL;
    `, [id, id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Credit type not found" })
    }

    const current = existing.rows[0]

    const updatedName = body.name !== undefined ? String(body.name).trim() : current.name
    const updatedBadge = body.badge !== undefined ? (body.badge ? String(body.badge).trim() : null) : current.badge
    const updatedDescription = body.description !== undefined ? String(body.description).trim() : current.description
    const updatedCategory = body.category !== undefined ? String(body.category).trim() : current.category
    const updatedHours = body.default_credit_hours !== undefined ? String(body.default_credit_hours).trim() : current.default_credit_hours
    const updatedOrg = body.organization_code !== undefined ? (body.organization_code ? String(body.organization_code).trim() : null) : current.organization_code
    const updatedIcon = body.icon !== undefined ? String(body.icon).trim() : current.icon
    const updatedActive = body.is_active !== undefined ? Boolean(body.is_active) : current.is_active
    const updatedHomepage = body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : current.show_on_homepage
    const updatedWebinars = body.show_on_webinars !== undefined ? Boolean(body.show_on_webinars) : current.show_on_webinars
    const updatedOrder = body.display_order !== undefined ? parseInt(body.display_order) || 0 : current.display_order

    const updateRes = await pgConnection.raw(`
      UPDATE credit_type SET
        name = ?,
        badge = ?,
        description = ?,
        category = ?,
        default_credit_hours = ?,
        organization_code = ?,
        icon = ?,
        is_active = ?,
        show_on_homepage = ?,
        show_on_webinars = ?,
        display_order = ?,
        updated_at = now()
      WHERE id = ?
      RETURNING *;
    `, [
      updatedName,
      updatedBadge,
      updatedDescription,
      updatedCategory,
      updatedHours,
      updatedOrg,
      updatedIcon,
      updatedActive,
      updatedHomepage,
      updatedWebinars,
      updatedOrder,
      current.id,
    ])

    res.json({
      credit_type: updateRes.rows[0],
      message: "Credit type updated successfully.",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update credit type", error: error.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const existing = await pgConnection.raw(`
      SELECT * FROM credit_type WHERE (id = ? OR code = ?) AND deleted_at IS NULL;
    `, [id, id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Credit type not found" })
    }

    const current = existing.rows[0]

    // Soft delete so historical webinar/order relationships are fully preserved
    await pgConnection.raw(`
      UPDATE credit_type SET
        deleted_at = now(),
        updated_at = now()
      WHERE id = ?;
    `, [current.id])

    res.json({
      success: true,
      message: `Credit type "${current.name}" deleted successfully. Historical records preserved.`,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete credit type", error: error.message })
  }
}
