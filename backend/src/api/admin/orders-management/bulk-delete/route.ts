import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const body = req.body as { ids?: string[] }
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : []

    if (ids.length === 0) {
      return res.status(400).json({ message: "No order IDs provided for bulk deletion." })
    }

    // Find all matching orders
    const placeholders = ids.map(() => "?").join(",")
    const ordersRes = await pgConnection.raw(
      `SELECT id, display_id FROM "order" WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    )

    const foundOrders = ordersRes.rows || []
    if (foundOrders.length === 0) {
      return res.status(404).json({ message: "None of the specified orders were found or already deleted." })
    }

    const foundIds = foundOrders.map((o: any) => o.id)
    const foundPlaceholders = foundIds.map(() => "?").join(",")

    // 1. Clean up child records for all selected orders
    await pgConnection.raw(`DELETE FROM customer_entitlement WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_email_notification WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_monitoring_incident WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_credit_line WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_transaction WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_item WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_shipping WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_summary WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_change WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_cart WHERE order_id IN (${foundPlaceholders})`, foundIds)
    await pgConnection.raw(`DELETE FROM order_payment_collection WHERE order_id IN (${foundPlaceholders})`, foundIds)

    // 2. Soft delete the orders
    await pgConnection.raw(`UPDATE "order" SET deleted_at = NOW() WHERE id IN (${foundPlaceholders})`, foundIds)

    // 3. Attempt hard delete if foreign keys allow
    try {
      await pgConnection.raw(`DELETE FROM "order" WHERE id IN (${foundPlaceholders})`, foundIds)
    } catch (ignoreErr) {
      // Soft-delete is active
    }

    res.json({
      success: true,
      count: foundIds.length,
      message: `Successfully deleted ${foundIds.length} order(s).`,
    })
  } catch (error: any) {
    console.error("[Admin Orders Bulk Delete API Error]:", error)
    res.status(500).json({
      message: "Failed to perform bulk order deletion",
      error: error.message,
    })
  }
}
