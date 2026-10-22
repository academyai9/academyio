import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSubscriberByUnsubscribeToken } from "../../../../utils/newsletter-db"

function maskEmail(email: string): string {
  const parts = email.split("@")
  if (parts.length !== 2) return "your email"
  const [user, domain] = parts
  const maskedUser =
    user.length > 2
      ? user.substring(0, 1) + "*".repeat(user.length - 2) + user.substring(user.length - 1)
      : user.substring(0, 1) + "*"
  return `${maskedUser}@${domain}`
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const token = typeof req.query.token === "string" ? req.query.token.trim() : ""

    if (!token) {
      return res.status(400).json({ success: false, error: "Token is required" })
    }

    const sub = await getSubscriberByUnsubscribeToken(pgConnection, token)
    if (!sub) {
      return res.status(404).json({ success: false, error: "Subscriber not found" })
    }

    return res.status(200).json({
      success: true,
      maskedEmail: maskEmail(sub.email),
      status: sub.status,
      firstName: sub.first_name,
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message })
  }
}
