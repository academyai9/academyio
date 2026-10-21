import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const result = await pgConnection.raw(`
      SELECT * FROM accreditation_organization WHERE (id = ? OR code = ?) AND deleted_at IS NULL;
    `, [id, id])

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Regulatory body not found" })
    }

    res.json({ organization: result.rows[0] })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch organization", error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as Record<string, any>

    const existing = await pgConnection.raw(`
      SELECT * FROM accreditation_organization WHERE (id = ? OR code = ?) AND deleted_at IS NULL;
    `, [id, id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Regulatory body not found" })
    }

    const current = existing.rows[0]

    const updatedName = body.name !== undefined ? body.name.trim() : current.name
    const updatedShortName = body.short_name !== undefined ? body.short_name.trim() : current.short_name
    const updatedLogoUrl = body.logo_url !== undefined ? body.logo_url.trim() : current.logo_url
    const updatedWebsiteUrl = body.website_url !== undefined ? (body.website_url ? body.website_url.trim() : null) : current.website_url
    const updatedAltText = body.alt_text !== undefined ? body.alt_text.trim() : current.alt_text
    const updatedDesc = body.description !== undefined ? body.description.trim() : current.description
    const updatedCreditType = body.default_credit_type !== undefined ? body.default_credit_type.trim() : current.default_credit_type
    const updatedEnabled = body.is_enabled !== undefined ? Boolean(body.is_enabled) : current.is_enabled
    const updatedShowOnHomepage = body.show_on_homepage !== undefined ? Boolean(body.show_on_homepage) : (current.show_on_homepage ?? true)
    const updatedOrder = body.display_order !== undefined ? parseInt(body.display_order) || 0 : current.display_order

    const updateRes = await pgConnection.raw(`
      UPDATE accreditation_organization SET
        name = ?,
        short_name = ?,
        logo_url = ?,
        website_url = ?,
        alt_text = ?,
        description = ?,
        default_credit_type = ?,
        is_enabled = ?,
        show_on_homepage = ?,
        display_order = ?,
        updated_at = now()
      WHERE id = ?
      RETURNING *;
    `, [
      updatedName,
      updatedShortName,
      updatedLogoUrl,
      updatedWebsiteUrl,
      updatedAltText,
      updatedDesc,
      updatedCreditType,
      updatedEnabled,
      updatedShowOnHomepage,
      updatedOrder,
      current.id,
    ])

    res.json({
      organization: updateRes.rows[0],
      message: "Regulatory body updated successfully.",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update regulatory body", error: error.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const existing = await pgConnection.raw(`
      SELECT * FROM accreditation_organization WHERE (id = ? OR code = ?) AND deleted_at IS NULL;
    `, [id, id])

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Regulatory body not found" })
    }

    const current = existing.rows[0]

    await pgConnection.raw(`
      UPDATE accreditation_organization SET
        deleted_at = now(),
        updated_at = now()
      WHERE id = ?;
    `, [current.id])

    res.json({
      success: true,
      message: `Regulatory body "${current.short_name}" deleted successfully.`,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete regulatory body", error: error.message })
  }
}
