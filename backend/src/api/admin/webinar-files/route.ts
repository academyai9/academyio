import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    const webinarId = req.query.webinar_id as string | undefined
    const purchaseOption = req.query.purchase_option as string | undefined
    const materialType = req.query.material_type as string | undefined
    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined

    let query = `
      SELECT 
        wf.id,
        wf.webinar_id,
        w.title as webinar_title,
        w.slug as webinar_slug,
        wf.purchase_option,
        wf.variant_id,
        wf.material_type,
        wf.title,
        wf.description,
        wf.s3_key,
        wf.s3_bucket,
        wf.s3_region,
        wf.file_name,
        wf.file_size,
        wf.mime_type,
        wf.is_active,
        wf.display_order,
        wf.upload_status,
        wf.metadata,
        wf.created_at,
        wf.updated_at
      FROM webinar_file wf
      JOIN webinar w ON w.id = wf.webinar_id
      WHERE wf.deleted_at IS NULL
    `
    const params: any[] = []

    if (webinarId && webinarId !== "all") {
      params.push(webinarId)
      query += ` AND wf.webinar_id = $${params.length}`
    }

    if (purchaseOption && purchaseOption !== "all") {
      params.push(purchaseOption)
      query += ` AND wf.purchase_option = $${params.length}`
    }

    if (materialType && materialType !== "all") {
      params.push(materialType)
      query += ` AND wf.material_type = $${params.length}`
    }

    if (status === "active") {
      query += ` AND wf.is_active = true`
    } else if (status === "inactive") {
      query += ` AND wf.is_active = false`
    }

    if (search && search.trim().length > 0) {
      params.push(`%${search.trim().toLowerCase()}%`)
      query += ` AND (LOWER(wf.title) LIKE $${params.length} OR LOWER(wf.file_name) LIKE $${params.length} OR LOWER(w.title) LIKE $${params.length})`
    }

    query += ` ORDER BY wf.display_order ASC, wf.created_at DESC`

    const filesRes = await pgConnection.raw(query, params)

    // Also fetch list of available webinars for dropdown filtering
    const webinarsRes = await pgConnection.raw(`
      SELECT id, title, slug, category, event_date, (event_date < NOW()) as is_completed, status
      FROM webinar
      ORDER BY event_date DESC;
    `)

    res.json({
      files: filesRes.rows || [],
      count: (filesRes.rows || []).length,
      webinars: webinarsRes.rows || [],
    })
  } catch (error: any) {
    console.error("Error fetching webinar files:", error)
    res.status(500).json({
      message: "Failed to fetch webinar files",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as any

    const {
      webinar_id,
      title,
      description,
      purchase_option = "all",
      variant_id,
      material_type = "handout",
      s3_key,
      s3_bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || "academyio-private-webinars",
      s3_region = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1",
      file_name,
      file_size = 0,
      mime_type = "application/octet-stream",
      is_active = true,
      display_order = 0,
      upload_status = "completed",
    } = body

    if (!webinar_id || !title || !s3_key || !file_name) {
      return res.status(400).json({
        message: "Missing required fields: webinar_id, title, s3_key, and file_name are required.",
      })
    }

    // Verify webinar exists
    const webCheck = await pgConnection.raw("SELECT id, title FROM webinar WHERE id = $1", [webinar_id])
    if (!webCheck.rows || webCheck.rows.length === 0) {
      return res.status(404).json({ message: "Specified webinar does not exist." })
    }

    const fileId = `wfile_${crypto.randomBytes(12).toString("hex")}`

    const insertRes = await pgConnection.raw(
      `
      INSERT INTO webinar_file (
        id, webinar_id, purchase_option, variant_id, material_type,
        title, description, s3_key, s3_bucket, s3_region,
        file_name, file_size, mime_type, is_active, display_order,
        upload_status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      )
      RETURNING *;
    `,
      [
        fileId,
        webinar_id,
        purchase_option,
        variant_id || null,
        material_type,
        title.trim(),
        description ? description.trim() : null,
        s3_key,
        s3_bucket,
        s3_region,
        file_name,
        parseInt(file_size as any, 10) || 0,
        mime_type,
        Boolean(is_active),
        parseInt(display_order as any, 10) || 0,
        upload_status,
      ]
    )

    res.status(201).json({
      message: "Webinar file recorded successfully",
      file: insertRes.rows[0],
    })
  } catch (error: any) {
    console.error("Error creating webinar file:", error)
    res.status(500).json({
      message: "Failed to record webinar file",
      error: error.message,
    })
  }
}
