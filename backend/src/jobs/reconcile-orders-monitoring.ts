import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { OrderReconciliationService } from "../modules/order-monitoring/reconciliation-service"

/**
 * Scheduled background job for automated missing order detection & reconciliation:
 * - Runs every 5 minutes in background
 * - Checks Scenarios A, B, C, D, E against persistent PostgreSQL tables
 * - Automatically emails support@academyio.com when genuine new missing orders or mismatches are found
 * - Completely idempotent (no duplicate alerts or duplicate incidents)
 */
export default async function reconcileOrdersMonitoring(container: MedusaContainer): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    // Check if monitoring is enabled in settings
    const settingRes = await pgConnection.raw(
      `SELECT value FROM order_monitoring_setting WHERE key = 'monitoring_enabled';`
    )
    if (settingRes.rows?.[0]?.value === "false") {
      return
    }

    // Get grace period from settings
    const graceRes = await pgConnection.raw(
      `SELECT value FROM order_monitoring_setting WHERE key = 'grace_period_minutes';`
    )
    const gracePeriod = parseInt(graceRes.rows?.[0]?.value || "5", 10)

    const result = await OrderReconciliationService.runReconciliation(pgConnection, {
      dryRun: false,
      gracePeriodMinutes: gracePeriod,
      adminEmail: "scheduler@academyio.com",
    })

    if (result.newIncidentsCount > 0) {
      logger.warn(
        `[OrderMonitoringJob] Detected ${result.newIncidentsCount} new order incidents. Email alerts dispatched to support@academyio.com.`
      )
    }
  } catch (err: any) {
    logger.error(`[OrderMonitoringJob] Error running scheduled reconciliation: ${err.message}`)
  }
}

export const config = {
  name: "reconcile-orders-monitoring",
  schedule: "*/5 * * * *", // Runs every 5 minutes
}
