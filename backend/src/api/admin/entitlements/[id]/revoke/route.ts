import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const [entitlement] = await webinarService.listCustomerEntitlements({ id })

  if (!entitlement) {
    return res.status(404).json({ message: "Entitlement not found" })
  }

  const updated = await webinarService.updateCustomerEntitlements({
    id,
    status: "revoked",
    revoked_at: new Date(),
    revocation_reason: body.reason || "Revoked by administrator",
  })

  res.json({
    message: "Entitlement revoked successfully",
    entitlement: updated,
  })
}
