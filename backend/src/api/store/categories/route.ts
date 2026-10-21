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
        COUNT(w.id)::int as webinars_count
      FROM product_category c
      LEFT JOIN webinar w ON (w.category = c.name AND w.status = 'published' AND w.deleted_at IS NULL)
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.name, c.handle, c.description, c.rank, c.is_active, c.metadata
      ORDER BY c.rank ASC, c.name ASC
    `)

    res.json({
      categories: categoriesQuery.rows || [],
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch store categories",
      error: error.message,
    })
  }
}
