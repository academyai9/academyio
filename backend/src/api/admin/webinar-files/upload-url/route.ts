import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { S3StorageService } from "../../../../modules/webinar/s3-storage-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as any
    const {
      webinarId,
      materialType = "handout",
      fileName,
      fileSize,
      mimeType,
      expiresInSeconds = 900,
    } = body

    if (!webinarId || !fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        message: "Missing required fields: webinarId, fileName, fileSize, and mimeType are required.",
      })
    }

    const validation = S3StorageService.validateUploadRequest({
      fileName,
      fileSize: parseInt(fileSize, 10),
      mimeType,
      materialType,
    })

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.error || "File validation failed.",
      })
    }

    const presignedData = await S3StorageService.getPresignedUploadUrl({
      webinarId,
      materialType,
      fileName,
      fileSize: parseInt(fileSize, 10),
      mimeType,
      expiresInSeconds: parseInt(expiresInSeconds, 10) || 900,
    })

    res.json({
      message: "Presigned upload URL generated successfully",
      ...presignedData,
    })
  } catch (error: any) {
    console.error("Error generating presigned upload URL:", error)
    res.status(500).json({
      message: error.message || "Failed to generate presigned upload URL",
      error: error.message,
    })
  }
}
