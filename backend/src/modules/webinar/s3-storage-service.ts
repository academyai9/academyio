import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"
import path from "path"
import fs from "fs"

export interface PresignedUploadResult {
  upload_url: string
  s3_key: string
  s3_bucket: string
  s3_region: string
  file_name: string
  mime_type: string
  material_type: string
  expires_in_seconds: number
  headers?: Record<string, string>
}

export interface PresignedDownloadResult {
  download_url: string
  file_name: string
  expires_in_seconds: number
}

// Allowed MIME types whitelist
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/rtf",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  // Video & Audio
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/wav",
  "audio/x-m4a",
])

// Dangerous executable and script extensions blacklist
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".zsh", ".bin",
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".php", ".phtml", ".py", ".pyc", ".rb", ".pl", ".cgi",
  ".vbs", ".vbe", ".ws", ".wsf", ".wsh", ".scr", ".jar",
  ".apk", ".msi", ".dll", ".so", ".dylib", ".sys",
  ".html", ".htm", ".xhtml", ".svg", // SVGs can contain script tags
])

const MAX_RECORDING_SIZE = 2.5 * 1024 * 1024 * 1024 // 2.5 GB
const MAX_DOCUMENT_SIZE = 200 * 1024 * 1024 // 200 MB

export class S3StorageService {
  private static s3ClientInstance: S3Client | null = null
  private static localFallbackDir = path.resolve(process.cwd(), "static/private-uploads")

  private static getRegion(): string {
    return process.env.AWS_REGION || "us-east-1"
  }

  private static getBucket(): string {
    return process.env.AWS_S3_BUCKET || "academyio-private-webinars"
  }

  /**
   * Initialize or return singleton S3Client instance
   */
  private static getS3Client(): S3Client {
    if (!this.s3ClientInstance) {
      const config: any = {
        region: this.getRegion(),
      }

      // Check for explicit credentials or EC2 instance profile / role
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      }

      // Optional custom endpoint for MinIO / LocalStack / GovCloud
      if (process.env.AWS_S3_ENDPOINT) {
        config.endpoint = process.env.AWS_S3_ENDPOINT
        config.forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true" || true
      }

      this.s3ClientInstance = new S3Client(config)
    }

    return this.s3ClientInstance
  }

  /**
   * Returns true if live AWS credentials or S3 endpoint is configured
   */
  public static isLiveS3Configured(): boolean {
    return Boolean(
      (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
      process.env.AWS_S3_ENDPOINT ||
      process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
      process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI
    )
  }

  /**
   * Validate file upload request metadata
   */
  public static validateUploadRequest(params: {
    fileName: string
    fileSize: number
    mimeType: string
    materialType?: string
  }): { valid: boolean; error?: string } {
    const { fileName, fileSize, mimeType, materialType } = params

    if (!fileName || typeof fileName !== "string" || fileName.trim().length === 0) {
      return { valid: false, error: "A valid filename is required." }
    }

    const ext = path.extname(fileName).toLowerCase()
    if (!ext) {
      return { valid: false, error: "Files must have a valid file extension." }
    }

    if (BLOCKED_EXTENSIONS.has(ext)) {
      return {
        valid: false,
        error: `Executable or script extension "${ext}" is strictly forbidden for security.`,
      }
    }

    const normalizedMime = (mimeType || "").toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return {
        valid: false,
        error: `Unsupported MIME type "${mimeType}". Allowed types include PDF, MP4, MOV, Word, Excel, PowerPoint, ZIP, and Text.`,
      }
    }

    // Size limits based on material type
    const isVideo = normalizedMime.startsWith("video/") || materialType === "recording"
    const maxSize = isVideo ? MAX_RECORDING_SIZE : MAX_DOCUMENT_SIZE

    if (fileSize > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024))
      return {
        valid: false,
        error: `File size exceeds the allowable limit of ${maxMb} MB for this asset type.`,
      }
    }

    return { valid: true }
  }

  /**
   * Generate sanitized unique S3 Object Key
   */
  public static generateObjectKey(params: {
    webinarId: string
    materialType: string
    fileName: string
  }): string {
    const ext = path.extname(params.fileName).toLowerCase()
    const baseName = path.basename(params.fileName, ext)
    const sanitizedBase = baseName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50)

    const randomSuffix = crypto.randomBytes(6).toString("hex")
    const timestamp = Date.now()
    const cleanExt = ext.replace(".", "")

    return `webinars/${params.webinarId}/${params.materialType}/${timestamp}-${randomSuffix}-${sanitizedBase}.${cleanExt}`
  }

  /**
   * Generate a short-lived presigned upload URL (HTTP PUT)
   */
  public static async getPresignedUploadUrl(params: {
    webinarId: string
    materialType: string
    fileName: string
    fileSize: number
    mimeType: string
    expiresInSeconds?: number
  }): Promise<PresignedUploadResult> {
    const validation = this.validateUploadRequest(params)
    if (!validation.valid) {
      throw new Error(validation.error || "File validation failed.")
    }

    const s3Key = this.generateObjectKey({
      webinarId: params.webinarId,
      materialType: params.materialType,
      fileName: params.fileName,
    })

    const bucket = this.getBucket()
    const region = this.getRegion()
    const expiresIn = params.expiresInSeconds || 900 // 15 minutes

    if (this.isLiveS3Configured()) {
      const client = this.getS3Client()
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: params.mimeType,
        Metadata: {
          "webinar-id": params.webinarId,
          "material-type": params.materialType,
          "original-filename": encodeURIComponent(params.fileName),
        },
      })

      const uploadUrl = await getSignedUrl(client, command, { expiresIn })

      return {
        upload_url: uploadUrl,
        s3_key: s3Key,
        s3_bucket: bucket,
        s3_region: region,
        file_name: params.fileName,
        mime_type: params.mimeType,
        material_type: params.materialType,
        expires_in_seconds: expiresIn,
        headers: {
          "Content-Type": params.mimeType,
        },
      }
    } else {
      // Local signed token upload fallback for dev environments without active AWS keys
      const token = this.generateLocalSignedToken(s3Key, params.fileName, params.mimeType, expiresIn)
      const uploadUrl = `/api/admin/webinar-files/local-upload?token=${token}&key=${encodeURIComponent(s3Key)}`

      return {
        upload_url: uploadUrl,
        s3_key: s3Key,
        s3_bucket: bucket,
        s3_region: region,
        file_name: params.fileName,
        mime_type: params.mimeType,
        material_type: params.materialType,
        expires_in_seconds: expiresIn,
      }
    }
  }

  /**
   * Generate a short-lived presigned download URL (HTTP GET)
   */
  public static async getPresignedDownloadUrl(params: {
    s3Key: string
    fileName: string
    mimeType?: string
    expiresInSeconds?: number
    asAttachment?: boolean
  }): Promise<PresignedDownloadResult> {
    const bucket = this.getBucket()
    const expiresIn = params.expiresInSeconds || 900 // 15 minutes default
    const safeFileName = params.fileName.replace(/["\r\n]/g, "")
    const dispositionType = params.asAttachment !== false ? "attachment" : "inline"
    const contentDisposition = `${dispositionType}; filename="${encodeURIComponent(safeFileName)}"`

    if (this.isLiveS3Configured()) {
      const client = this.getS3Client()
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: params.s3Key,
        ResponseContentDisposition: contentDisposition,
        ResponseContentType: params.mimeType,
      })

      const downloadUrl = await getSignedUrl(client, command, { expiresIn })

      return {
        download_url: downloadUrl,
        file_name: safeFileName,
        expires_in_seconds: expiresIn,
      }
    } else {
      // Local signed token download fallback for dev environment
      const token = this.generateLocalSignedToken(params.s3Key, safeFileName, params.mimeType || "application/octet-stream", expiresIn)
      const downloadUrl = `/api/store/customer/webinar-files/local-download?token=${token}&key=${encodeURIComponent(params.s3Key)}`

      return {
        download_url: downloadUrl,
        file_name: safeFileName,
        expires_in_seconds: expiresIn,
      }
    }
  }

  /**
   * Delete object from Amazon S3
   */
  public static async deleteS3Object(s3Key: string): Promise<boolean> {
    if (!s3Key) return false

    try {
      if (this.isLiveS3Configured()) {
        const client = this.getS3Client()
        await client.send(
          new DeleteObjectCommand({
            Bucket: this.getBucket(),
            Key: s3Key,
          })
        )
      } else {
        // Delete from local fallback if exists
        const localPath = path.resolve(this.localFallbackDir, s3Key)
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath)
        }
      }
      return true
    } catch (err) {
      console.error("Error deleting S3 object:", s3Key, err)
      return false
    }
  }

  /**
   * Verify an object exists in S3
   */
  public static async checkObjectExists(s3Key: string): Promise<boolean> {
    if (!s3Key) return false

    try {
      if (this.isLiveS3Configured()) {
        const client = this.getS3Client()
        await client.send(
          new HeadObjectCommand({
            Bucket: this.getBucket(),
            Key: s3Key,
          })
        )
        return true
      } else {
        const localPath = path.resolve(this.localFallbackDir, s3Key)
        return fs.existsSync(localPath)
      }
    } catch {
      return false
    }
  }

  /**
   * Helper: Generate a secure HMAC-SHA256 signed token for local development proxy
   */
  private static generateLocalSignedToken(
    key: string,
    fileName: string,
    mimeType: string,
    expiresInSeconds: number
  ): string {
    const secret = process.env.JWT_SECRET || process.env.COOKIE_SECRET || "academyio_s3_secret_2026"
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
    const payload = `${key}|${fileName}|${mimeType}|${exp}`
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex")
    return Buffer.from(JSON.stringify({ key, fileName, mimeType, exp, signature })).toString("base64url")
  }

  /**
   * Helper: Verify a secure HMAC-SHA256 signed token for local development proxy
   */
  public static verifyLocalSignedToken(tokenString: string): { valid: boolean; key?: string; fileName?: string; mimeType?: string } {
    try {
      const secret = process.env.JWT_SECRET || process.env.COOKIE_SECRET || "academyio_s3_secret_2026"
      const decoded = JSON.parse(Buffer.from(tokenString, "base64url").toString("utf8"))
      const { key, fileName, mimeType, exp, signature } = decoded

      if (Date.now() / 1000 > exp) {
        return { valid: false }
      }

      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${key}|${fileName}|${mimeType}|${exp}`)
        .digest("hex")

      if (signature !== expected) {
        return { valid: false }
      }

      return { valid: true, key, fileName, mimeType }
    } catch {
      return { valid: false }
    }
  }

  /**
   * Save a file stream or buffer to local fallback storage (for dev testing)
   */
  public static saveLocalFile(s3Key: string, buffer: Buffer): void {
    const fullPath = path.resolve(this.localFallbackDir, s3Key)
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(fullPath, buffer)
  }

  /**
   * Read a file buffer from local fallback storage (for dev testing)
   */
  public static getLocalFileStream(s3Key: string): fs.ReadStream | null {
    const fullPath = path.resolve(this.localFallbackDir, s3Key)
    if (!fs.existsSync(fullPath)) return null
    return fs.createReadStream(fullPath)
  }
}
