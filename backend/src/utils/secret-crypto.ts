import crypto from "crypto"

const PREFIX = "enc:v1:"

function getEncryptionKey(): Buffer {
  const raw =
    process.env.PAYMENT_ENCRYPTION_KEY?.trim() ||
    process.env.COOKIE_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim()

  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[SECURITY] PAYMENT_ENCRYPTION_KEY is required in production.")
    }
    return crypto.createHash("sha256").update("dev-only-payment-encryption-key").digest()
  }

  return crypto.createHash("sha256").update(raw).digest()
}

/**
 * Encrypts a sensitive string using AES-256-GCM.
 * Returns null/empty values unchanged. Already-encrypted values are returned as-is.
 */
export function encryptSecret(plaintext?: string | null): string | null {
  if (!plaintext) return plaintext ?? null
  if (plaintext.startsWith(PREFIX)) return plaintext

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${PREFIX}${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`
}

/**
 * Decrypts an AES-256-GCM encrypted secret.
 * Legacy plaintext rows (without `enc:v1:` prefix) are returned unchanged for backward compatibility.
 */
export function decryptSecret(stored?: string | null): string | null {
  if (!stored) return stored ?? null
  if (!stored.startsWith(PREFIX)) return stored

  try {
    const parts = stored.slice(PREFIX.length).split(".")
    if (parts.length !== 3) return null
    const [ivB64, tagB64, dataB64] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivB64, "base64")
    const authTag = Buffer.from(tagB64, "base64")
    const ciphertext = Buffer.from(dataB64, "base64")

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  } catch (err: any) {
    console.error("[SECURITY] Failed to decrypt stored secret:", err?.message || err)
    return null
  }
}
