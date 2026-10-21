import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { homepage_only } = req.query as Record<string, any>

    let sql = `
      SELECT 
        id,
        customer_name,
        designation,
        company,
        avatar_url,
        content,
        rating,
        featured_homepage,
        display_order,
        created_at
      FROM testimonial
      WHERE deleted_at IS NULL AND is_published = true
    `
    const params: any[] = []

    if (homepage_only === "true") {
      sql += ` AND featured_homepage = true`
    }

    sql += ` ORDER BY display_order ASC, created_at DESC;`

    const result = await pgConnection.raw(sql, params)

    res.json({
      testimonials: result.rows || [],
      count: (result.rows || []).length,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch testimonials",
      error: error.message,
    })
  }
}
