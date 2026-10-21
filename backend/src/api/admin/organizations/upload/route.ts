import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as Record<string, any>
    const { filename, dataUrl, base64 } = body

    if (!dataUrl && !base64) {
      return res.status(400).json({ message: "No image data provided. Expected dataUrl or base64." })
    }

    let fileBuffer: Buffer
    let ext = ".svg"

    if (dataUrl && typeof dataUrl === "string") {
      const match = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
      if (match) {
        ext = match[1] === "svg+xml" ? ".svg" : `.${match[1]}`
        fileBuffer = Buffer.from(match[2], "base64")
      } else {
        return res.status(400).json({ message: "Invalid image dataUrl format." })
      }
    } else if (base64 && typeof base64 === "string") {
      fileBuffer = Buffer.from(base64, "base64")
      if (filename && path.extname(filename)) {
        ext = path.extname(filename)
      }
    } else {
      return res.status(400).json({ message: "Unsupported payload format." })
    }

    const cleanName = (filename ? path.basename(filename, path.extname(filename)) : "logo")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
    const finalFilename = `${cleanName}_${Date.now()}${ext}`

    // Directories to save logo to
    const rootDir = process.cwd()
    const backendLogosDir = path.resolve(rootDir, "static/logos")
    const storefrontLogosDir = path.resolve(rootDir, "../storefront/public/logos")

    if (!fs.existsSync(backendLogosDir)) {
      fs.mkdirSync(backendLogosDir, { recursive: true })
    }
    fs.writeFileSync(path.join(backendLogosDir, finalFilename), fileBuffer)

    if (fs.existsSync(path.dirname(storefrontLogosDir))) {
      if (!fs.existsSync(storefrontLogosDir)) {
        fs.mkdirSync(storefrontLogosDir, { recursive: true })
      }
      fs.writeFileSync(path.join(storefrontLogosDir, finalFilename), fileBuffer)
    }

    const publicUrl = `/logos/${finalFilename}`

    res.json({
      url: publicUrl,
      filename: finalFilename,
      message: "Logo uploaded successfully.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to upload logo",
      error: error.message,
    })
  }
}
