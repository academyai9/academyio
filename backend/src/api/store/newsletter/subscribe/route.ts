import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { subscribeVisitor } from "../../../../utils/newsletter-db"
import { sendNewsletterVerificationEmail } from "../../../../utils/newsletter-email"
import { verifyTurnstileToken } from "../../../../utils/verify-turnstile"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = (req.body as any) || {}

    const email = typeof body.email === "string" ? body.email.trim() : ""
    const firstName = typeof body.first_name === "string" ? body.first_name.trim() : null
    const consent = Boolean(body.consent)
    const source = typeof body.source === "string" ? body.source.trim() : "website_footer"
    const captchaToken = body.captcha_token || body["cf-turnstile-response"]

    // 1. Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email) || email.length > 254) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid email address.",
      })
    }

    // 2. Validate Consent
    if (!consent) {
      return res.status(400).json({
        success: false,
        error: "Consent is required. Please check the agreement box before subscribing.",
      })
    }

    // 3. Client IP
    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null
    const userAgent = (req.headers["user-agent"] as string) || null

    // 4. Verify Turnstile CAPTCHA (required in production when configured, or whenever supplied)
    if (captchaToken || (process.env.NODE_ENV === "production" && process.env.TURNSTILE_SECRET_KEY)) {
      const captchaRes = await verifyTurnstileToken(captchaToken, clientIp)
      if (!captchaRes.success) {
        return res.status(403).json({
          success: false,
          error: "Security verification failed. Please complete the CAPTCHA and try again.",
        })
      }
    }

    // 5. Store / update subscription in database
    const result = await subscribeVisitor(pgConnection, {
      email,
      firstName,
      consentSource: source,
      ip: clientIp,
      userAgent,
    })

    if (result.action === "already_active") {
      return res.status(200).json({
        success: true,
        status: "active",
        message: "You are already an active subscriber to AcademyIO newsletters!",
      })
    }

    // 6. Send verification email with single-use confirmation token
    let emailSent = false
    let emailError: string | undefined

    try {
      const sendRes = await sendNewsletterVerificationEmail({
        to: result.subscriber.email,
        toName: result.subscriber.first_name,
        verificationToken: result.verificationToken,
      })
      emailSent = sendRes.success
      emailError = sendRes.error
    } catch (err: any) {
      console.error("[Newsletter Subscribe] Error sending verification email:", err)
      emailError = err.message
    }

    return res.status(200).json({
      success: true,
      status: "pending",
      message:
        "Please check your inbox! A confirmation email has been sent to complete your subscription.",
      emailSent,
      emailError,
    })
  } catch (error: any) {
    console.error("[Newsletter Subscribe Route] Error:", error)
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process newsletter subscription. Please try again.",
    })
  }
}
