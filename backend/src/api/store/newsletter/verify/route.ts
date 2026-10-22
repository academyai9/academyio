import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { verifySubscriberToken } from "../../../../utils/newsletter-db"
import { sendNewsletterWelcomeEmail } from "../../../../utils/newsletter-email"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const token = typeof req.query.token === "string" ? req.query.token.trim() : ""

    if (!token) {
      return res.status(400).json({
        success: false,
        reason: "missing_token",
        error: "Verification token is required.",
      })
    }

    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null

    const result = await verifySubscriberToken(pgConnection, token, clientIp)

    if (!result.success) {
      if (result.reason === "expired") {
        return res.status(400).json({
          success: false,
          reason: "expired",
          error: "This confirmation link has expired. Please sign up again to receive a fresh verification link.",
        })
      }
      return res.status(400).json({
        success: false,
        reason: "invalid",
        error: "Invalid or already used confirmation link.",
      })
    }

    // Send Welcome Email if this was a fresh activation (not already active)
    if (result.reason !== "already_active" && result.subscriber) {
      try {
        await sendNewsletterWelcomeEmail({
          to: result.subscriber.email,
          toName: result.subscriber.first_name,
          unsubscribeToken: result.subscriber.unsubscribe_token,
        })
      } catch (e) {
        console.warn("[Newsletter Verify] Could not send welcome email:", e)
      }
    }

    return res.status(200).json({
      success: true,
      reason: result.reason || "activated",
      message: "Subscription confirmed! Welcome to the AcademyIO newsletter.",
      subscriber: {
        email: result.subscriber?.email,
        first_name: result.subscriber?.first_name,
        status: "active",
      },
    })
  } catch (error: any) {
    console.error("[Newsletter Verify Route] Error:", error)
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify subscription.",
    })
  }
}
