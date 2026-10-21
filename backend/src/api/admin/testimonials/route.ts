import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const result = await pgConnection.raw(`
      SELECT 
        id,
        customer_name,
        designation,
        company,
        avatar_url,
        content,
        rating,
        is_published,
        featured_homepage,
        display_order,
        created_at,
        updated_at
      FROM testimonial
      WHERE deleted_at IS NULL
      ORDER BY display_order ASC, created_at DESC;
    `)

    const rows = result.rows || []
    const totalCount = rows.length
    const publishedCount = rows.filter((r: any) => r.is_published).length
    const featuredCount = rows.filter((r: any) => r.featured_homepage).length

    res.json({
      testimonials: rows,
      count: totalCount,
      metrics: {
        total: totalCount,
        published: publishedCount,
        featured: featuredCount,
      },
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch admin testimonials",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as Record<string, any>

    const {
      customer_name,
      designation,
      company,
      avatar_url,
      content,
      rating = 5,
      is_published = true,
      featured_homepage = true,
      display_order = 0,
    } = body

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ message: "Customer name is required" })
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Testimonial content is required" })
    }
    if (!designation || !designation.trim()) {
      return res.status(400).json({ message: "Professional designation/title is required" })
    }

    const id = `testim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const insertResult = await pgConnection.raw(`
      INSERT INTO testimonial (
        id,
        customer_name,
        designation,
        company,
        avatar_url,
        content,
        rating,
        is_published,
        featured_homepage,
        display_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
      RETURNING *;
    `, [
      id,
      customer_name.trim(),
      designation.trim(),
      company ? company.trim() : null,
      avatar_url ? avatar_url.trim() : null,
      content.trim(),
      Math.min(5, Math.max(1, parseInt(rating) || 5)),
      Boolean(is_published),
      Boolean(featured_homepage),
      parseInt(display_order) || 0,
    ])

    res.status(201).json({
      testimonial: insertResult.rows[0],
      message: "Testimonial created successfully",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create testimonial",
      error: error.message,
    })
  }
}
