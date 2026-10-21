import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OrderReconciliationService } from "../../../../modules/order-monitoring/reconciliation-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = (req.body as Record<string, any>) || {}

    const dryRun = Boolean(body.dry_run)
    const gracePeriodMinutes = body.grace_period_minutes ? parseInt(body.grace_period_minutes, 10) : 5

    // Get admin email if available from authenticated session
    const adminUser = (req as any).auth_context?.actor_id || "admin@academyio.com"

    const result = await OrderReconciliationService.runReconciliation(pgConnection, {
      dryRun,
      gracePeriodMinutes,
      adminEmail: adminUser,
    })

    res.json({
      success: true,
      message: dryRun
        ? `Reconciliation dry run complete: evaluated ${result.totalChecked} records (${result.detectedIncidents.length} anomalies detected).`
        : `Reconciliation executed: evaluated ${result.totalChecked} records, generated ${result.newIncidentsCount} new incidents with automatic email alerts to support@academyio.com.`,
      result,
    })
  } catch (error: any) {
    console.error("[Reconciliation Trigger Error]:", error)
    res.status(500).json({
      success: false,
      message: "Failed to execute order reconciliation",
      error: error.message,
    })
  }
}
