import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const catQuery = await pgConnection.raw(`
      SELECT * FROM product_category WHERE (id = ? OR handle = ?) AND deleted_at IS NULL
    `, [id, id])

    if (!catQuery.rows.length) {
      return res.status(404).json({ message: "Category not found" })
    }

    const category = catQuery.rows[0]

    // Fetch associated webinars
    const webinarsQuery = await pgConnection.raw(`
      SELECT id, title, slug, event_date, status, is_upcoming, is_ondemand, cpe_credits, speaker_name, featured_image
      FROM webinar
      WHERE category = ? AND deleted_at IS NULL
      ORDER BY event_date ASC
    `, [category.name])

    res.json({
      category: {
        ...category,
        webinars_count: webinarsQuery.rows.length,
        webinars: webinarsQuery.rows,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch category details",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as {
      name?: string
      handle?: string
      description?: string
      rank?: number
      is_active?: boolean
      metadata?: Record<string, any>
    }

    const catQuery = await pgConnection.raw(`
      SELECT * FROM product_category WHERE (id = ? OR handle = ?) AND deleted_at IS NULL
    `, [id, id])

    if (!catQuery.rows.length) {
      return res.status(404).json({ message: "Category not found" })
    }

    const currentCat = catQuery.rows[0]
    const updatedName = body.name !== undefined ? body.name.trim() : currentCat.name
    const updatedHandle = body.handle !== undefined ? body.handle.trim() : currentCat.handle
    const updatedDescription = body.description !== undefined ? body.description : currentCat.description
    const updatedRank = body.rank !== undefined ? body.rank : currentCat.rank
    const updatedIsActive = body.is_active !== undefined ? Boolean(body.is_active) : currentCat.is_active
    const updatedMetadata = body.metadata !== undefined ? body.metadata : currentCat.metadata

    // If handle is changing, check duplicate
    if (updatedHandle !== currentCat.handle) {
      const handleCheck = await pgConnection.raw(`
        SELECT id FROM product_category WHERE handle = ? AND id != ? AND deleted_at IS NULL
      `, [updatedHandle, currentCat.id])
      if (handleCheck.rows.length > 0) {
        return res.status(400).json({ message: `A category with handle '${updatedHandle}' already exists` })
      }
    }

    // Safe transaction: Update category and sync webinars if name changed
    await pgConnection.transaction(async (trx: any) => {
      await trx.raw(`
        UPDATE product_category
        SET name = ?, handle = ?, description = ?, rank = ?, is_active = ?, metadata = ?, updated_at = NOW()
        WHERE id = ?
      `, [updatedName, updatedHandle, updatedDescription, updatedRank, updatedIsActive, JSON.stringify(updatedMetadata), currentCat.id])

      // If category name changed, preserve all associated webinars!
      if (updatedName !== currentCat.name) {
        await trx.raw(`
          UPDATE webinar
          SET category = ?, updated_at = NOW()
          WHERE category = ?
        `, [updatedName, currentCat.name])
      }
    })

    // Fetch updated webinar count
    const countQuery = await pgConnection.raw(`
      SELECT COUNT(*)::int as count FROM webinar WHERE category = ? AND deleted_at IS NULL
    `, [updatedName])

    res.json({
      category: {
        id: currentCat.id,
        name: updatedName,
        handle: updatedHandle,
        description: updatedDescription,
        rank: updatedRank,
        is_active: updatedIsActive,
        metadata: updatedMetadata,
        webinars_count: countQuery.rows[0]?.count || 0,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update category",
      error: error.message,
    })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { id } = req.params
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const catQuery = await pgConnection.raw(`
      SELECT * FROM product_category WHERE (id = ? OR handle = ?) AND deleted_at IS NULL
    `, [id, id])

    if (!catQuery.rows.length) {
      return res.status(404).json({ message: "Category not found" })
    }

    const currentCat = catQuery.rows[0]

    // Check if webinars are assigned to this category
    const webinarsQuery = await pgConnection.raw(`
      SELECT count(*)::int as count FROM webinar WHERE category = ? AND deleted_at IS NULL
    `, [currentCat.name])

    const webinarCount = webinarsQuery.rows[0]?.count || 0
    if (webinarCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category '${currentCat.name}' because it has ${webinarCount} associated webinar(s). Reassign or archive these webinars first to protect course continuity.`,
      })
    }

    // Soft delete or delete
    await pgConnection.raw(`
      UPDATE product_category SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?
    `, [currentCat.id])

    res.json({
      message: `Category '${currentCat.name}' deleted successfully`,
      id: currentCat.id,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete category",
      error: error.message,
    })
  }
}
