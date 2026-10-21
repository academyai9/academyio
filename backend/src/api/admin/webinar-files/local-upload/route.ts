import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { S3StorageService } from "../../../../modules/webinar/s3-storage-service"

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  return handleLocalUpload(req, res)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  return handleLocalUpload(req, res)
}

async function handleLocalUpload(req: MedusaRequest, res: MedusaResponse) {
  try {
    const token = req.query.token as string
    const key = req.query.key as string

    if (!token || !key) {
      return res.status(400).json({ message: "Missing token or key parameter." })
    }

    const verification = S3StorageService.verifyLocalSignedToken(token)
    if (!verification.valid || verification.key !== key) {
      return res.status(403).json({ message: "Invalid or expired upload token." })
    }

    // Read incoming chunks
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer) => chunks.push(chunk))
      req.on("end", () => resolve())
      req.on("error", (err: Error) => reject(err))
    })

    const buffer = Buffer.concat(chunks)
    S3StorageService.saveLocalFile(key, buffer)

    res.status(200).json({ message: "File stored in private local bucket." })
  } catch (error: any) {
    console.error("Local upload error:", error)
    res.status(500).json({ message: "Upload failed", error: error.message })
  }
}
