import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OrderReconciliationService } from "../../../../../modules/order-monitoring/reconciliation-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const adminUser = {
      id: (req as any).auth_context?.actor_id || "admin_user",
      email: (req as any).auth_context?.actor_id || "admin@academyio.com",
    }

    const result = await OrderReconciliationService.grantMissingEntitlement(
      pgConnection,
      id,
      adminUser
    )

    res.json({
      success: true,
      message: `Webinar entitlement successfully granted to customer (Entitlement ID: ${result.entitlementId}).`,
      result,
    })
  } catch (error: any) {
    console.error("[Grant Access Error]:", error)
    res.status(400).json({
      success: false,
      message: error.message || "Failed to grant webinar entitlement",
    })
  }
}
