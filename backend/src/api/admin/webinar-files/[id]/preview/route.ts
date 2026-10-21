import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { S3StorageService } from "../../../../../modules/webinar/s3-storage-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const fileRes = await pgConnection.raw(
      "SELECT * FROM webinar_file WHERE id = $1 AND deleted_at IS NULL",
      [id]
    )

    if (!fileRes.rows || fileRes.rows.length === 0) {
      return res.status(404).json({ message: "Webinar file not found" })
    }

    const file = fileRes.rows[0]

    // Generate short-lived presigned URL (15 minutes)
    const downloadData = await S3StorageService.getPresignedDownloadUrl({
      s3Key: file.s3_key,
      fileName: file.file_name,
      mimeType: file.mime_type,
      expiresInSeconds: 900,
      asAttachment: false, // For admin preview, inline if possible
    })

    res.json({
      message: "Admin preview URL generated",
      download_url: downloadData.download_url,
      file_name: downloadData.file_name,
      expires_in_seconds: downloadData.expires_in_seconds,
    })
  } catch (error: any) {
    console.error("Error generating admin preview URL:", error)
    res.status(500).json({ message: "Failed to generate preview URL", error: error.message })
  }
}
