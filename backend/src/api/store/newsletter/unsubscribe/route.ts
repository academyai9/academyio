import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { unsubscribeByToken } from "../../../../utils/newsletter-db"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = (req.body as any) || {}
    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : typeof req.query.token === "string"
        ? req.query.token.trim()
        : ""
    const reason = typeof body.reason === "string" ? body.reason.trim() : null

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Unsubscribe token is required.",
      })
    }

    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null

    const result = await unsubscribeByToken(pgConnection, token, reason, clientIp)

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: "Invalid or expired unsubscribe link. If you need assistance, please contact support@academyio.com.",
      })
    }

    return res.status(200).json({
      success: true,
      alreadyUnsubscribed: result.alreadyUnsubscribed,
      message: "You have been successfully unsubscribed from AcademyIO marketing newsletters.",
    })
  } catch (error: any) {
    console.error("[Newsletter Unsubscribe Route] Error:", error)
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process unsubscribe request.",
    })
  }
}

export const GET = POST
