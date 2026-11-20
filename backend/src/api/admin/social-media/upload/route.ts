import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import path from "path"

const ALLOWED_IMAGE_EXTS: Record<string, string> = {
  png: ".png",
  jpeg: ".jpg",
  jpg: ".jpg",
  webp: ".webp",
  gif: ".gif",
}
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5MB

function hasValidImageMagicBytes(buf: Buffer): boolean {
  if (buf.length < 12) return false
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return true
  return false
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as Record<string, any>
    const { filename, dataUrl, base64 } = body

    if (!dataUrl && !base64) {
      return res.status(400).json({ message: "No icon data provided. Expected dataUrl or base64." })
    }

    let fileBuffer: Buffer
    let ext = ""

    if (dataUrl && typeof dataUrl === "string") {
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i)
      if (!match) {
        return res.status(400).json({
          message: "Unsupported icon format. Only PNG, JPG, WEBP, and GIF images are allowed.",
        })
      }
      ext = ALLOWED_IMAGE_EXTS[match[1].toLowerCase()]
      fileBuffer = Buffer.from(match[2], "base64")
    } else if (base64 && typeof base64 === "string") {
      fileBuffer = Buffer.from(base64, "base64")
      const rawExt = filename ? path.extname(filename).toLowerCase().replace(".", "") : ""
      ext = ALLOWED_IMAGE_EXTS[rawExt] || ""
      if (!ext) {
        return res.status(400).json({
          message: "Unsupported file extension. Only PNG, JPG, WEBP, and GIF images are allowed.",
        })
      }
    } else {
      return res.status(400).json({ message: "Unsupported payload format." })
    }

    if (fileBuffer.length === 0 || fileBuffer.length > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ message: "Icon size must be between 1 byte and 5MB." })
    }

    if (!hasValidImageMagicBytes(fileBuffer)) {
      return res.status(400).json({ message: "Uploaded file content does not match a valid PNG, JPG, WEBP, or GIF image." })
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
