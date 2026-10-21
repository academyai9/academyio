import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { verifyTurnstileToken } from "../../utils/verify-turnstile"

/**
 * Middleware to enforce Cloudflare Turnstile CAPTCHA on customer registration.
 * Blocks direct API registration attempts that lack a valid CAPTCHA token.
 */
export async function customerRegistrationCaptchaMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Only protect registration POST requests
  if (req.method !== "POST") {
    return next()
  }

  const body = (req.body as any) || {}
  const captchaToken =
    body.captcha_token ||
    body["cf-turnstile-response"] ||
    req.headers["x-captcha-token"] ||
    req.headers["cf-turnstile-response"]

  const clientIp =
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress

  if (!captchaToken || typeof captchaToken !== "string" || !captchaToken.trim()) {
    return res.status(400).json({
      type: "invalid_captcha",
      message: "Security verification required: CAPTCHA token is missing.",
      error_code: "missing_captcha_token",
    })
  }

  const result = await verifyTurnstileToken(captchaToken, clientIp)

  if (!result.success) {
    return res.status(403).json({
      type: "invalid_captcha",
      message: result.message || "Security verification failed. Please complete the CAPTCHA and retry.",
      error_codes: result.error_codes,
    })
  }

  // Verification passed - continue to registration handler
  return next()
}
