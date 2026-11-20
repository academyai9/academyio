import { encryptSecret, decryptSecret } from "../secret-crypto"
import { checkRateLimit } from "../rate-limiter"
import { verifyTurnstileToken } from "../verify-turnstile"
import { S3StorageService } from "../../modules/webinar/s3-storage-service"

describe("Security Hardening Unit & Regression Tests", () => {
  describe("AES-256-GCM Secret Encryption (secret-crypto)", () => {
    it("encrypts and decrypts secrets cleanly with unique IVs", () => {
      const secret = "sk_test_example_secret_key_12345"
      const enc1 = encryptSecret(secret)
      const enc2 = encryptSecret(secret)

      expect(enc1).toBeTruthy()
      expect(enc1).not.toEqual(secret)
      expect(enc1).toMatch(/^enc:v1:/)
      expect(enc1).not.toEqual(enc2)
      expect(decryptSecret(enc1)).toEqual(secret)
      expect(decryptSecret(enc2)).toEqual(secret)
    })

    it("rejects tampered ciphertext", () => {
      const enc = encryptSecret("whsec_original_value")!
      const parts = enc.split(".")
      parts[2] = Buffer.from("tampered_payload").toString("base64")
      const tampered = parts.join(".")
      expect(decryptSecret(tampered)).toBeNull()
    })

    it("preserves legacy plaintext rows for backward compatibility", () => {
      expect(decryptSecret("legacy_plaintext_key")).toEqual("legacy_plaintext_key")
    })
  })

  describe("Rate Limiter (rate-limiter)", () => {
    it("allows requests within limit and blocks requests over limit", () => {
      const bucket = `test_bucket_${Date.now()}`
      const r1 = checkRateLimit(bucket, "1.2.3.4", 2, 60_000)
      const r2 = checkRateLimit(bucket, "1.2.3.4", 2, 60_000)
      const r3 = checkRateLimit(bucket, "1.2.3.4", 2, 60_000)

      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
      expect(r3.allowed).toBe(false)
      expect(r3.remaining).toBe(0)
      expect(r3.retryAfterSeconds).toBeGreaterThan(0)
    })
  })

  describe("Turnstile CAPTCHA Hardening (verify-turnstile)", () => {
    const origEnv = process.env.NODE_ENV
    const origSecret = process.env.TURNSTILE_SECRET_KEY

    afterEach(() => {
      process.env.NODE_ENV = origEnv
      if (origSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY
      else process.env.TURNSTILE_SECRET_KEY = origSecret
    })

    it("rejects missing or empty tokens", async () => {
      const res = await verifyTurnstileToken("")
      expect(res.success).toBe(false)
    })

    it("blocks human_fallback bypass tokens in production", async () => {
      process.env.NODE_ENV = "production"
      delete process.env.TURNSTILE_SECRET_KEY
      const res = await verifyTurnstileToken(`human_fallback_${Date.now()}`)
      expect(res.success).toBe(false)
    })

    it("blocks test bypass tokens in production", async () => {
      process.env.NODE_ENV = "production"
      delete process.env.TURNSTILE_SECRET_KEY
      const res = await verifyTurnstileToken("valid-token")
      expect(res.success).toBe(false)
    })
  })

  describe("S3 Local Storage Path Traversal & Signature Protection", () => {
    it("blocks path traversal keys in resolveSafeLocalPath", () => {
      expect(() => S3StorageService.resolveSafeLocalPath("../../etc/passwd")).toThrow(
        /Path traversal/
      )
      expect(() => S3StorageService.resolveSafeLocalPath("webinars/../../../.env")).toThrow(
        /Path traversal/
      )
      expect(() => S3StorageService.resolveSafeLocalPath("valid/key\0.pdf")).toThrow(
        /Invalid storage object key/
      )
    })

    it("allows valid nested keys inside localFallbackDir", () => {
      const safe = S3StorageService.resolveSafeLocalPath("webinars/web_123/pdf/sample.pdf")
      expect(safe).toContain("webinars")
      expect(safe).toContain("sample.pdf")
    })

    it("sanitizes webinarId and materialType in generateObjectKey", () => {
      const key = S3StorageService.generateObjectKey({
        webinarId: "../web_123",
        materialType: "../pdf",
        fileName: "Tax Guide 2026.pdf",
      })
      expect(key).not.toContain("..")
      expect(key).toMatch(/^webinars\/web_123\/pdf\//)
    })

    it("rejects tampered or forged local signed tokens", () => {
      const result = S3StorageService.verifyLocalSignedToken("invalid_token_data")
      expect(result.valid).toBe(false)
    })
  })
})
