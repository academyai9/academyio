import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { S3StorageService } from "../../../../modules/webinar/s3-storage-service"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarId = req.query.webinarId as string
    const rawFileName = req.query.fileName as string
    const materialType = (req.query.materialType as string) || "handout"
    const rawMimeType = (req.query.mimeType as string) || "application/octet-stream"

    const fileName = rawFileName ? decodeURIComponent(rawFileName) : ""

    if (!webinarId || !fileName) {
      return res.status(400).json({
        message: "Missing required query parameters: webinarId and fileName are required.",
      })
    }

    // Read raw incoming binary stream from request with maximum compatibility
    let fileBuffer: Buffer

    if (Buffer.isBuffer(req.body)) {
      fileBuffer = req.body
    } else if (Buffer.isBuffer((req as any).rawBody)) {
      fileBuffer = (req as any).rawBody
    } else if (typeof req.body === "string" && req.body.length > 0) {
      fileBuffer = Buffer.from(req.body)
    } else if (typeof (req as any).rawBody === "string" && (req as any).rawBody.length > 0) {
      fileBuffer = Buffer.from((req as any).rawBody)
    } else if (req.readable) {
      const chunks: Buffer[] = []
      await new Promise<void>((resolve, reject) => {
        req.on("data", (chunk: Buffer) => chunks.push(chunk))
        req.on("end", () => resolve())
        req.on("error", (err: Error) => reject(err))
      })
      fileBuffer = Buffer.concat(chunks)
    } else {
      fileBuffer = Buffer.alloc(0)
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ message: "No file content received in stream body." })
    }

    const fileSize = fileBuffer.length
    const validation = S3StorageService.validateUploadRequest({
      fileName,
      fileSize,
      mimeType: rawMimeType,
      materialType,
    })

    if (!validation.valid) {
      return res.status(400).json({ message: validation.error })
    }

    const finalMime = validation.resolvedMime || rawMimeType || "application/octet-stream"
    const s3Key = S3StorageService.generateObjectKey({
      webinarId,
      materialType,
      fileName,
    })

    const bucket = S3StorageService.getBucket()
    const region = S3StorageService.getRegion()

    if (S3StorageService.isLiveS3Configured()) {
      try {
        const client = S3StorageService.getS3Client()
        await client.send(
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
        console.warn("Live S3/R2 upload warning, storing in local fallback:", s3Err.message)
        S3StorageService.saveLocalFile(s3Key, fileBuffer)
      }
    } else {
      S3StorageService.saveLocalFile(s3Key, fileBuffer)
    }

    res.json({
      message: "File streamed successfully to private storage",
      s3_key: s3Key,
      s3_bucket: bucket,
      s3_region: region,
      file_name: fileName,
      file_size: fileSize,
      mime_type: finalMime,
      material_type: materialType,
    })
  } catch (error: any) {
    console.error("Stream upload error:", error)
    res.status(500).json({ message: "Streaming upload failed", error: error.message })
  }
}
