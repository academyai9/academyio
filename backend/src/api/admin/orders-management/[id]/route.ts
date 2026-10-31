import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const orderRes = await pgConnection.raw(`
      SELECT 
        o.id,
        o.display_id,
        o.status as order_status,
        o.email as customer_email,
        o.currency_code,
        o.created_at,
        o.updated_at,
        o.canceled_at,
        o.metadata,
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.phone as customer_phone,
        COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 0) as order_total,
        COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) as paid_total,
        COALESCE(CAST(s.totals->>'refunded_total' AS numeric), 0) as refunded_total,
        s.totals as summary_totals
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      LEFT JOIN customer c ON c.id = o.customer_id
      WHERE o.id = ? OR CAST(o.display_id AS text) = ?
      LIMIT 1;
    `, [id, id])

    const order = orderRes.rows?.[0]
    if (!order) {
      return res.status(404).json({ message: `Order '${id}' not found` })
    }

    // Line items
    const itemsRes = await pgConnection.raw(`
      SELECT 
        oi.id as order_item_id,
        oi.quantity,
        oi.unit_price,
        oli.id as item_id,
        oli.title,
        oli.variant_title,
        oli.thumbnail,
        oli.product_id,
        oli.variant_id,
        oli.metadata as item_metadata
      FROM order_item oi
      JOIN order_line_item oli ON oli.id = oi.item_id
      WHERE oi.order_id = ?;
    `, [order.id])

    // Payment transactions & collections
    const paymentsRes = await pgConnection.raw(`
      SELECT 
        pc.id as payment_collection_id,
        pc.status as payment_collection_status,
        pc.amount as pc_amount,
        pc.currency_code as pc_currency,
        p.id as payment_id,
        p.amount as payment_amount,
        p.currency_code as payment_currency,
        p.provider_id,
        p.captured_at,
        p.canceled_at,
        p.data as payment_provider_data,
        p.created_at as payment_created_at
      FROM order_payment_collection opc
      JOIN payment_collection pc ON pc.id = opc.payment_collection_id
      LEFT JOIN payment p ON p.payment_collection_id = pc.id
      WHERE opc.order_id = ?;
    `, [order.id])

    // Customer entitlements
    const entRes = await pgConnection.raw(`
      SELECT 
        ce.id,
        ce.webinar_id,
        ce.access_type,
        ce.status,
        ce.variant_title,
        ce.granted_at,
        ce.expires_at,
        w.title as webinar_title,
        w.slug as webinar_slug
      FROM customer_entitlement ce
      LEFT JOIN webinar w ON w.id = ce.webinar_id
      WHERE ce.order_id = ?;
    `, [order.id])

    // Incidents (cleared)
    const incRes = { rows: [] }

    // Linked Cart
    const cartRes = await pgConnection.raw(`
      SELECT c.id as cart_id, c.completed_at, c.created_at
      FROM order_cart oc
      JOIN cart c ON c.id = oc.cart_id
      WHERE oc.order_id = ?
      LIMIT 1;
    `, [order.id])

    // Email notification status
    const emailNotifRes = await pgConnection.raw(`
      SELECT 
        id,
        order_id,
        notification_type,
        recipient_email,
        recipient_name,
        subject,
        status,
        attempt_count,
        provider,
        provider_message_id,
        error_message,
        sent_at,
        last_attempt_at,
        created_at,
        updated_at
      FROM order_email_notification
      WHERE order_id = ? AND notification_type = 'order_confirmation'
      LIMIT 1;
    `, [order.id])

    const customerName = [order.first_name, order.last_name].filter(Boolean).join(" ") || "Customer"

    res.json({
      order: {
        ...order,
        customer_name: customerName,
        currency_code: (order.currency_code || "usd").toUpperCase(),
        cart: cartRes.rows?.[0] || null,
        items: itemsRes.rows || [],
        payments: paymentsRes.rows || [],
        entitlements: entRes.rows || [],
        incidents: incRes.rows || [],
        email_notification: emailNotifRes.rows?.[0] || null,
      },
    })
  } catch (error: any) {
    console.error("[Admin Order Detail API Error]:", error)
    res.status(500).json({
      message: "Failed to fetch order details",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as {
      status?: string
      email?: string
      notes?: string
      metadata?: Record<string, any>
    }

    const orderRes = await pgConnection.raw(
      `SELECT id, display_id, status, email, metadata FROM "order" WHERE (id = ? OR CAST(display_id AS text) = ?) AND deleted_at IS NULL LIMIT 1`,
      [id, id]
    )
    const order = orderRes.rows?.[0]
    if (!order) {
      return res.status(404).json({ message: `Order '${id}' not found` })
    }

    const validStatuses = ["pending", "completed", "draft", "archived", "canceled", "requires_action"]
    const newStatus = body.status && validStatuses.includes(body.status) ? body.status : order.status
    const newEmail = (body.email || order.email || "").trim()

    let currentMetadata = order.metadata || {}
    if (typeof currentMetadata === "string") {
      try {
        currentMetadata = JSON.parse(currentMetadata)
      } catch {
        currentMetadata = {}
      }
    }

    if (body.notes !== undefined) {
      currentMetadata.admin_notes = body.notes
    }
    if (body.metadata && typeof body.metadata === "object") {
      currentMetadata = { ...currentMetadata, ...body.metadata }
    }

    const isCanceling = newStatus === "canceled" && order.status !== "canceled"
    const isUncanceling = newStatus !== "canceled" && order.status === "canceled"

    await pgConnection.raw(
      `UPDATE "order"
       SET status = ?,
           email = ?,
           metadata = ?::jsonb,
           canceled_at = CASE 
             WHEN ? = true THEN NOW()
             WHEN ? = true THEN NULL
             ELSE canceled_at
           END,
           updated_at = NOW()
       WHERE id = ?`,
      [
        newStatus,
        newEmail,
        JSON.stringify(currentMetadata),
        isCanceling,
        isUncanceling,
        order.id,
      ]
    )

    if (newStatus === "completed") {
      await pgConnection.raw(
        `UPDATE customer_entitlement SET status = 'active', updated_at = NOW() WHERE order_id = ? AND status != 'active'`,
        [order.id]
      )
    }

    res.json({
      success: true,
      message: `Order #${order.display_id} updated successfully.`,
      order: {
        id: order.id,
        display_id: order.display_id,
        status: newStatus,
        email: newEmail,
        metadata: currentMetadata,
      },
    })
  } catch (error: any) {
    console.error("[Admin Order Update API Error]:", error)
    res.status(500).json({
      message: "Failed to update order",
      error: error.message,
    })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    const orderRes = await pgConnection.raw(
      `SELECT id, display_id FROM "order" WHERE (id = ? OR CAST(display_id AS text) = ?) AND deleted_at IS NULL LIMIT 1`,
      [id, id]
    )
    const order = orderRes.rows?.[0]
    if (!order) {
      return res.status(404).json({ message: `Order '${id}' not found` })
    }

    const orderId = order.id

    // 1. Clean up child records
    await pgConnection.raw(`DELETE FROM customer_entitlement WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_email_notification WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_credit_line WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_transaction WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_item WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_shipping WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_summary WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_change WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_cart WHERE order_id = ?`, [orderId])
    await pgConnection.raw(`DELETE FROM order_payment_collection WHERE order_id = ?`, [orderId])

    // 2. Soft-delete the order
    await pgConnection.raw(`UPDATE "order" SET deleted_at = NOW() WHERE id = ?`, [orderId])

    // 3. Attempt hard delete
    try {
      await pgConnection.raw(`DELETE FROM "order" WHERE id = ?`, [orderId])
    } catch (ignoreErr) {
      // Soft-delete is active
    }

    res.json({
      success: true,
      message: `Order #${order.display_id || orderId} has been successfully deleted.`,
    })
  } catch (error: any) {
    console.error("[Admin Order Delete API Error]:", error)
    res.status(500).json({
      message: "Failed to delete order",
      error: error.message,
    })
  }
}
