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

    // Linked Order Monitoring Incidents
    const incRes = await pgConnection.raw(`
      SELECT 
        id,
        incident_type,
        severity,
        status,
        description,
        detection_rule,
        recommended_action,
        email_alert_sent,
        email_alert_sent_at,
        created_at,
        resolved_at,
        resolved_by
      FROM order_monitoring_incident
      WHERE order_id = ? OR expected_order_id = ?;
    `, [order.id, order.id])

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
