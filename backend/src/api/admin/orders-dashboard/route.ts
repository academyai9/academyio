import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const query = req.query as Record<string, any>
    const range = (query.range as string) || "30d" // today, 7d, 30d, all

    let dateFilterSql = ""
    if (range === "today") {
      dateFilterSql = "AND o.created_at >= date_trunc('day', now())"
    } else if (range === "7d") {
      dateFilterSql = "AND o.created_at >= now() - interval '7 days'"
    } else if (range === "30d") {
      dateFilterSql = "AND o.created_at >= now() - interval '30 days'"
    }

    // 1. Core Summary Metrics
    const summaryResult = await pgConnection.raw(`
      SELECT
        COUNT(o.id) as total_orders,
        COUNT(CASE WHEN o.created_at >= date_trunc('day', now()) THEN 1 END) as orders_today,
        COUNT(CASE WHEN o.status = 'completed' OR COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) >= COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 1) THEN 1 END) as paid_orders,
        COUNT(CASE WHEN o.status = 'pending' AND COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) = 0 THEN 1 END) as pending_orders,
        COUNT(CASE WHEN o.status = 'canceled' THEN 1 END) as canceled_orders,
        COALESCE(SUM(
          CASE 
            WHEN o.status != 'canceled' AND COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) > 0 
            THEN CAST(s.totals->>'paid_total' AS numeric)
            ELSE 0 
          END
        ), 0) as total_revenue,
        COALESCE(AVG(
          CASE 
            WHEN o.status != 'canceled' AND COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) > 0 
            THEN CAST(s.totals->>'paid_total' AS numeric)
          END
        ), 0) as average_order_value
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      WHERE o.deleted_at IS NULL ${dateFilterSql};
    `)

    const metrics = summaryResult.rows?.[0] || {
      total_orders: 0,
      orders_today: 0,
      paid_orders: 0,
      pending_orders: 0,
      canceled_orders: 0,
      total_revenue: 0,
      average_order_value: 0,
    }

    // 2. Count Orders Requiring Attention (Missing customer entitlements on paid orders)
    const attentionResult = await pgConnection.raw(`
      SELECT COUNT(DISTINCT o.id) as count
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      WHERE o.deleted_at IS NULL
        AND (o.status = 'completed' OR COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) >= COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 1))
        AND NOT EXISTS (
          SELECT 1 FROM customer_entitlement ce WHERE ce.order_id = o.id
        );
    `)
    const openIncidentsCount = parseInt(attentionResult.rows?.[0]?.count || 0, 10)

    // 3. Daily Trend Chart Data (Last 14 days or filtered period)
    const trendResult = await pgConnection.raw(`
      WITH date_series AS (
        SELECT generate_series(
          date_trunc('day', now() - interval '13 days'),
          date_trunc('day', now()),
          interval '1 day'
        )::date as day
      )
      SELECT
        to_char(ds.day, 'Mon DD') as date_label,
        to_char(ds.day, 'YYYY-MM-DD') as date_key,
        COUNT(o.id) as orders_count,
        COALESCE(SUM(
          CASE 
            WHEN o.status != 'canceled' AND COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) > 0 
            THEN CAST(s.totals->>'paid_total' AS numeric) 
            ELSE 0 
          END
        ), 0) as revenue
      FROM date_series ds
      LEFT JOIN "order" o ON date_trunc('day', o.created_at)::date = ds.day AND o.deleted_at IS NULL
      LEFT JOIN order_summary s ON s.order_id = o.id
      GROUP BY ds.day
      ORDER BY ds.day ASC;
    `)

    // 4. Recent Orders Table (Top 6)
    const recentOrdersResult = await pgConnection.raw(`
      SELECT
        o.id,
        o.display_id,
        o.status as order_status,
        o.email as customer_email,
        o.currency_code,
        o.created_at,
        c.first_name,
        c.last_name,
        COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 0) as order_total,
        COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) as paid_total,
        (
          SELECT json_agg(json_build_object(
            'title', oli.title,
            'variant_title', oli.variant_title,
            'quantity', oi.quantity,
            'unit_price', oli.unit_price
          ))
          FROM order_item oi
          JOIN order_line_item oli ON oli.id = oi.item_id
          WHERE oi.order_id = o.id
        ) as items,
        (
          SELECT COUNT(ce.id)
          FROM customer_entitlement ce
          WHERE ce.order_id = o.id AND ce.status = 'active'
        ) as active_entitlements_count
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      LEFT JOIN customer c ON c.id = o.customer_id
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 6;
    `)

    res.json({
      metrics: {
        total_orders: parseInt(metrics.total_orders, 10),
        orders_today: parseInt(metrics.orders_today, 10),
        paid_orders: parseInt(metrics.paid_orders, 10),
        pending_orders: parseInt(metrics.pending_orders, 10),
        canceled_orders: parseInt(metrics.canceled_orders, 10),
        orders_requiring_attention: openIncidentsCount,
        total_revenue: parseFloat(metrics.total_revenue),
        average_order_value: parseFloat(metrics.average_order_value),
      },
      chart_data: trendResult.rows || [],
      recent_orders: (recentOrdersResult.rows || []).map((o: any) => ({
        ...o,
        customer_name: [o.first_name, o.last_name].filter(Boolean).join(" ") || "Customer",
        payment_status:
          parseFloat(o.paid_total) >= parseFloat(o.order_total) && parseFloat(o.order_total) > 0
            ? "Paid"
            : o.order_status === "canceled"
            ? "Canceled"
            : parseFloat(o.paid_total) > 0
            ? "Partially Paid"
            : "Pending",
      })),
      range,
    })
  } catch (error: any) {
    console.error("[Admin Orders Dashboard API Error]:", error)
    res.status(500).json({
      message: "Failed to generate orders dashboard statistics",
      error: error.message,
    })
  }
}
