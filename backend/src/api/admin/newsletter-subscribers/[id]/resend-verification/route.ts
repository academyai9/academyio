import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resendVerificationAdmin } from "../../../../../utils/newsletter-db"
import { sendNewsletterVerificationEmail } from "../../../../../utils/newsletter-email"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const adminUser = (req as any).auth_context?.actor_id || "admin"

    const result = await resendVerificationAdmin(pgConnection, id, adminUser)
    if (!result.success || !result.subscriber || !result.verificationToken) {
      return res.status(400).json({ error: result.error || "Failed to reissue verification token." })
    }

    const emailRes = await sendNewsletterVerificationEmail({
      to: result.subscriber.email,
      toName: result.subscriber.first_name,
      verificationToken: result.verificationToken,
    })

    return res.status(200).json({
      success: true,
      message: `Verification email resent to ${result.subscriber.email}.`,
      emailSent: emailRes.success,
      emailError: emailRes.error,
    })
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to resend verification." })
  }
}
