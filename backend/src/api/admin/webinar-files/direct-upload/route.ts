import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { S3StorageService } from "../../../../modules/webinar/s3-storage-service"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

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
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (match) {
        fileBuffer = Buffer.from(match[2], "base64")
      } else {
        return res.status(400).json({ message: "Invalid dataUrl format." })
      }
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

    const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || "academyio-private-webinars"
    const region = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1"

    if (S3StorageService.isLiveS3Configured()) {
      try {
        const config: any = { region }
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY
        const endpoint = process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT

        if (accessKeyId && secretAccessKey) {
          config.credentials = {
            accessKeyId,
            secretAccessKey,
          }
        }
        if (endpoint) {
          config.endpoint = endpoint
          config.forcePathStyle = true
        }
        const s3Client = new S3Client(config)
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
      // Local fallback
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
