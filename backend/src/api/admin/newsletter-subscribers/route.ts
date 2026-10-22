import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  listSubscribersAdmin,
  addSubscriberAdmin,
} from "../../../utils/newsletter-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const query = req.query as Record<string, any>

    const result = await listSubscribersAdmin(pgConnection, {
      search: query.search,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as any,
      limit: query.limit ? Number(query.limit) : 20,
      offset: query.offset ? Number(query.offset) : 0,
    })

    return res.status(200).json(result)
  } catch (error: any) {
    console.error("[Admin Newsletter Subscribers GET] Error:", error)
    return res.status(500).json({ error: error.message || "Failed to load subscribers." })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = (req.body as any) || {}

    const email = typeof body.email === "string" ? body.email.trim() : ""
    const firstName = typeof body.first_name === "string" ? body.first_name.trim() : null
    const status = body.status === "pending" ? "pending" : "active"
    const consentDocumentation =
      typeof body.consent_documentation === "string" ? body.consent_documentation.trim() : ""

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid email address is required." })
    }

    if (!consentDocumentation || consentDocumentation.length < 5) {
      return res.status(400).json({
        error: "Documented consent basis is required (e.g., written permission, prior webinar attendee opt-in).",
      })
    }

    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const subscriber = await addSubscriberAdmin(pgConnection, {
      email,
      firstName,
      status,
      consentDocumentation,
      adminUser,
    })

    return res.status(201).json({
      success: true,
      message: `Subscriber ${email} added successfully as ${status}.`,
      subscriber,
    })
  } catch (error: any) {
    console.error("[Admin Newsletter Subscribers POST] Error:", error)
    return res.status(500).json({ error: error.message || "Failed to add subscriber." })
  }
}
