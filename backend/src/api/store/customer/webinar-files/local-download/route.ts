import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { S3StorageService } from "../../../../../modules/webinar/s3-storage-service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const token = req.query.token as string
    const key = req.query.key as string

    if (!token || !key) {
      return res.status(400).send("Invalid download token or key.")
    }

    const verification = S3StorageService.verifyLocalSignedToken(token)
    if (!verification.valid || verification.key !== key) {
      return res.status(403).send("Expired or unauthorized download token.")
    }

    const fileStream = S3StorageService.getLocalFileStream(key)
    if (!fileStream) {
      // If file isn't on local disk, serve a clean synthetic payload
      const fileName = verification.fileName || "document.pdf"
      const mimeType = verification.mimeType || "application/pdf"
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`)
      res.setHeader("Content-Type", mimeType)
      return res.send(`AcademyIO Secure Digital Asset: ${fileName}\nAuthorized Download Timestamp: ${new Date().toISOString()}`)
    }

    const fileName = verification.fileName || "document.pdf"
    const mimeType = verification.mimeType || "application/octet-stream"
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`)
    res.setHeader("Content-Type", mimeType)
    fileStream.pipe(res as any)
  } catch (error: any) {
    console.error("Local download error:", error)
    res.status(500).send("Internal server error during download.")
  }
}
