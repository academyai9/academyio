import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { reactivateSubscriberAdmin } from "../../../../../utils/newsletter-db"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = (req.body as any) || {}
    const rawConsent = typeof body.consent_documentation === "string" ? body.consent_documentation.trim() : ""
    const consentDocumentation = rawConsent && rawConsent.length >= 5
      ? rawConsent
      : "Re-subscribed by administrator via Super Admin Panel"
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const updated = await reactivateSubscriberAdmin(pgConnection, id, consentDocumentation, adminUser)

    return res.status(200).json({
      success: true,
      message: `Subscriber ${updated.email} has been reactivated with documented consent.`,
      subscriber: updated,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to reactivate subscriber." })
  }
}
