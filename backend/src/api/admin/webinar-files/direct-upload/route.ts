import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { S3StorageService } from "../../../../modules/webinar/s3-storage-service"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as any
    const { webinarId, materialType = "handout", fileName, mimeType, dataUrl, base64 } = body

    if (!webinarId || !fileName || (!dataUrl && !base64)) {
      return res.status(400).json({
        message: "Missing required upload data: webinarId, fileName, and base64/dataUrl content required.",
      })
    }

    let fileBuffer: Buffer
    if (dataUrl && typeof dataUrl === "string") {
      const commaIdx = dataUrl.indexOf(",")
      const base64Str = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl
      fileBuffer = Buffer.from(base64Str, "base64")
    } else if (base64 && typeof base64 === "string") {
      fileBuffer = Buffer.from(base64, "base64")
    } else {
      return res.status(400).json({ message: "Invalid file buffer payload." })
    }

    const fileSize = fileBuffer.length
    const validation = S3StorageService.validateUploadRequest({
      fileName,
      fileSize,
      mimeType: mimeType || "application/octet-stream",
      materialType,
    })

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error })
    }

    const finalMime = validation.resolvedMime || mimeType || "application/octet-stream"

    const s3Key = S3StorageService.generateObjectKey({
      webinarId,
      materialType,
      fileName,
    })

    const bucket = S3StorageService.getBucket()
    const region = S3StorageService.getRegion()

    if (S3StorageService.isLiveS3Configured()) {
      try {
        const s3Client = S3StorageService.getS3Client()
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: finalMime,
            Metadata: {
              "webinar-id": webinarId,
              "material-type": materialType,
              "original-filename": encodeURIComponent(fileName),
            },
          })
        )
      } catch (s3Err: any) {
        console.warn("Live S3 upload failed, using secure local fallback storage:", s3Err.message)
        S3StorageService.saveLocalFile(s3Key, fileBuffer)
      }
    } else {
      S3StorageService.saveLocalFile(s3Key, fileBuffer)
    }

    res.json({
      message: "File uploaded successfully to private storage",
      s3_key: s3Key,
      s3_bucket: bucket,
      s3_region: region,
      file_name: fileName,
      file_size: fileSize,
      mime_type: finalMime,
      material_type: materialType,
    })
  } catch (error: any) {
    console.error("Error in direct file upload:", error)
    res.status(500).json({ message: "Failed to upload file", error: error.message })
  }
}
