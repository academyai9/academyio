/**
 * Cloudflare Turnstile Server-Side Verification Utility.
 *
 * Verifies Turnstile CAPTCHA response tokens with Cloudflare's siteverify API.
 * Uses official Cloudflare testing keys as local development fallback:
 * - Always Passes: Sitekey 1x00000000000000000000AA / Secret 1x0000000000000000000000000000000AA
 * - Always Blocks: Sitekey 2x00000000000000000000AA / Secret 2x0000000000000000000000000000000AA
 * - Spent/Expired: Secret 3x0000000000000000000000000000000AA
 */

export interface TurnstileVerificationResult {
  success: boolean
  challenge_ts?: string
  hostname?: string
  error_codes?: string[]
  message?: string
}

const CLOUDFLARE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// Cloudflare Turnstile Secret Key
const DEFAULT_TURNSTILE_SECRET = "0x4AAAAAAFgxi8gbs0wUCicgzYnc-b2qHI0"

export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string | null
): Promise<TurnstileVerificationResult> {
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error_codes: ["missing-input-response"],
      message: "Please complete the security verification challenge before continuing.",
    }
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY || DEFAULT_TURNSTILE_SECRET

  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY ERROR] TURNSTILE_SECRET_KEY is not configured in production!")
      return {
        success: false,
        error_codes: ["missing-secret-key-configuration"],
        message: "Security verification configuration error. Please contact support.",
      }
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const payload: Record<string, string> = {
      secret: secretKey.trim(),
      response: token.trim(),
    }

    if (remoteIp && typeof remoteIp === "string") {
      payload.remoteip = remoteIp.trim()
    }

    const response = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`[TURNSTILE HTTP ERROR] Status: ${response.status} ${response.statusText}`)
      return {
        success: false,
        error_codes: [`http-status-${response.status}`],
        message: "Security verification service unavailable. Please retry in a moment.",
      }
    }

    const data: any = await response.json()

    if (data.success === true) {
      return {
        success: true,
        challenge_ts: data.challenge_ts,
        hostname: data.hostname,
      }
    }

    const errorCodes: string[] = Array.isArray(data["error-codes"]) ? data["error-codes"] : []
    let userMessage = "Security verification failed. Please refresh and try again."

    if (errorCodes.includes("timeout-or-duplicate")) {
      userMessage = "Security verification token expired or already used. Please complete the check again."
    } else if (errorCodes.includes("invalid-input-response")) {
      userMessage = "Invalid security verification response. Please complete the check again."
    }

    return {
      success: false,
      error_codes: errorCodes,
      message: userMessage,
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("[TURNSTILE TIMEOUT] Verification request timed out after 8s")
      return {
        success: false,
        error_codes: ["request-timeout"],
        message: "Security verification timed out. Please check your internet connection and try again.",
      }
    }

    console.error("[TURNSTILE ERROR] Verification exception:", error)
    return {
      success: false,
      error_codes: ["internal-error"],
      message: "An unexpected error occurred during security verification. Please retry.",
    }
  }
}
