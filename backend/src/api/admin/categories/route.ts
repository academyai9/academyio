import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const categoriesQuery = await pgConnection.raw(`
      SELECT 
        c.id,
        c.name,
        c.handle,
        c.description,
        c.rank,
        c.is_active,
        c.metadata,
        c.created_at,
        c.updated_at,
        COUNT(w.id)::int as webinars_count
      FROM product_category c
      LEFT JOIN webinar w ON (w.category = c.name AND w.deleted_at IS NULL)
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.handle, c.description, c.rank, c.is_active, c.metadata, c.created_at, c.updated_at
      ORDER BY c.rank ASC, c.name ASC
    `)

    res.json({
      categories: categoriesQuery.rows || [],
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to list admin categories",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as {
      name: string
      handle?: string
      description?: string
      rank?: number
      is_active?: boolean
      metadata?: Record<string, any>
    }

    if (!body.name || !body.name.trim()) {
      return res.status(400).json({ message: "Category name is required" })
    }

    const name = body.name.trim()
    const handle = (body.handle || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).trim()
    const description = body.description || ""
    const rank = typeof body.rank === "number" ? body.rank : 0
    const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true
    const metadata = body.metadata || {}
    const id = `pcat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Check duplicate handle
    const existing = await pgConnection.raw(`
      SELECT id FROM product_category WHERE handle = ? AND deleted_at IS NULL
    `, [handle])

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: `A category with handle '${handle}' already exists` })
    }

    await pgConnection.raw(`
      INSERT INTO product_category (
        id, name, handle, description, mpath, is_active, is_internal, rank, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, false, ?, ?, NOW(), NOW())
    `, [id, name, handle, description, id, is_active, rank, JSON.stringify(metadata)])

    res.status(201).json({
      category: {
        id,
        name,
        handle,
        description,
        rank,
        is_active,
        metadata,
        webinars_count: 0,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create category",
      error: error.message,
    })
  }
}
