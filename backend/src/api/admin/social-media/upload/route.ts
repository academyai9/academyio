import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as Record<string, any>
    const { filename, dataUrl, base64 } = body

    if (!dataUrl && !base64) {
      return res.status(400).json({ message: "No icon data provided. Expected dataUrl or base64." })
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

    const cleanName = (filename ? path.basename(filename, path.extname(filename)) : "social_icon")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
    const finalFilename = `${cleanName}_${Date.now()}${ext}`

    const rootDir = process.cwd()
    const backendDir = path.resolve(rootDir, "static/logos/social")
    const storefrontDir = path.resolve(rootDir, "../storefront/public/logos/social")

    if (!fs.existsSync(backendDir)) {
      fs.mkdirSync(backendDir, { recursive: true })
    }
    fs.writeFileSync(path.join(backendDir, finalFilename), fileBuffer)

    if (fs.existsSync(path.dirname(storefrontDir))) {
      if (!fs.existsSync(storefrontDir)) {
        fs.mkdirSync(storefrontDir, { recursive: true })
      }
      fs.writeFileSync(path.join(storefrontDir, finalFilename), fileBuffer)
    }

    const publicUrl = `/logos/social/${finalFilename}`

    res.json({
      url: publicUrl,
      filename: finalFilename,
      message: "Custom icon uploaded successfully.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to upload custom icon",
      error: error.message,
    })
  }
}
