import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { S3StorageService } from "../../../../modules/webinar/s3-storage-service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const fileRes = await pgConnection.raw(
      `
      SELECT wf.*, w.title as webinar_title, w.slug as webinar_slug
      FROM webinar_file wf
      JOIN webinar w ON w.id = wf.webinar_id
      WHERE wf.id = $1 AND wf.deleted_at IS NULL;
    `,
      [id]
    )

    if (!fileRes.rows || fileRes.rows.length === 0) {
      return res.status(404).json({ message: "Webinar file not found" })
    }

    res.json({ file: fileRes.rows[0] })
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch file", error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // Support POST as PUT for update
  return handleUpdate(req, res)
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  return handleUpdate(req, res)
}

async function handleUpdate(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as any

    // Fetch existing
    const existing = await pgConnection.raw(
      "SELECT * FROM webinar_file WHERE id = $1 AND deleted_at IS NULL",
      [id]
    )

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Webinar file not found" })
    }

    const current = existing.rows[0]

    // If file is being replaced with a new S3 object key, clean up the old one
    if (body.s3_key && body.s3_key !== current.s3_key) {
      // Check if other records reference old s3_key
      const otherRef = await pgConnection.raw(
        "SELECT id FROM webinar_file WHERE s3_key = $1 AND id != $2 AND deleted_at IS NULL",
        [current.s3_key, id]
      )
      if (!otherRef.rows || otherRef.rows.length === 0) {
        await S3StorageService.deleteS3Object(current.s3_key)
      }
    }

    const updated = await pgConnection.raw(
      `
      UPDATE webinar_file
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        purchase_option = COALESCE($3, purchase_option),
        material_type = COALESCE($4, material_type),
        variant_id = COALESCE($5, variant_id),
        is_active = COALESCE($6, is_active),
        display_order = COALESCE($7, display_order),
        s3_key = COALESCE($8, s3_key),
        file_name = COALESCE($9, file_name),
        file_size = COALESCE($10, file_size),
        mime_type = COALESCE($11, mime_type),
        upload_status = COALESCE($12, upload_status),
        updated_at = NOW()
      WHERE id = $13 AND deleted_at IS NULL
      RETURNING *;
    `,
      [
        body.title !== undefined ? body.title.trim() : null,
        body.description !== undefined ? body.description.trim() : null,
        body.purchase_option || null,
        body.material_type || null,
        body.variant_id !== undefined ? body.variant_id : null,
        body.is_active !== undefined ? Boolean(body.is_active) : null,
        body.display_order !== undefined ? parseInt(body.display_order, 10) : null,
        body.s3_key || null,
        body.file_name || null,
        body.file_size !== undefined ? parseInt(body.file_size, 10) : null,
        body.mime_type || null,
        body.upload_status || null,
        id,
      ]
    )

    res.json({
      message: "Webinar file updated successfully",
      file: updated.rows[0],
    })
  } catch (error: any) {
    console.error("Error updating webinar file:", error)
    res.status(500).json({ message: "Failed to update webinar file", error: error.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const existing = await pgConnection.raw(
      "SELECT * FROM webinar_file WHERE id = $1 AND deleted_at IS NULL",
      [id]
    )

    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ message: "Webinar file not found" })
    }

    const file = existing.rows[0]

    // Soft-delete the database record
    await pgConnection.raw(
      "UPDATE webinar_file SET deleted_at = NOW(), is_active = false WHERE id = $1",
      [id]
    )

    // Check if any other non-deleted file references the same S3 object key
    const refCheck = await pgConnection.raw(
      "SELECT id FROM webinar_file WHERE s3_key = $1 AND deleted_at IS NULL",
      [file.s3_key]
    )

    if (!refCheck.rows || refCheck.rows.length === 0) {
      // Clean up from S3
      await S3StorageService.deleteS3Object(file.s3_key)
    }

    res.json({
      message: "Webinar file deleted successfully",
      id,
      deleted: true,
    })
  } catch (error: any) {
    console.error("Error deleting webinar file:", error)
    res.status(500).json({ message: "Failed to delete webinar file", error: error.message })
  }
}
