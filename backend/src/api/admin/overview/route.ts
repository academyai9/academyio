import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const query = req.query as Record<string, any>
    const range = (query.range as string) || "30d" // today, 7d, 30d, all

    let daysInterval = 30
    if (range === "today") daysInterval = 1
    else if (range === "7d") daysInterval = 7
    else if (range === "30d") daysInterval = 30
    else if (range === "all") daysInterval = 365

    // 1. Customer Metrics
    const customerStats = await pgConnection.raw(`
      SELECT 
        COUNT(id) AS total_customers,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS new_customers_30d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS new_customers_7d,
        COUNT(CASE WHEN COALESCE(metadata->>'account_status', 'active') = 'active' THEN 1 END) AS active_accounts,
        COUNT(CASE WHEN metadata->>'account_status' = 'inactive' THEN 1 END) AS inactive_accounts,
        COUNT(CASE WHEN metadata->>'account_status' = 'suspended' THEN 1 END) AS suspended_accounts
      FROM customer
      WHERE deleted_at IS NULL;
    `)
    const cStats = customerStats.rows?.[0] || {}

    // 2. Subscription Metrics
    const subStats = await pgConnection.raw(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_subscriptions,
        COUNT(CASE WHEN status IN ('expired', 'canceled') THEN 1 END) AS expired_subscriptions,
        COUNT(id) AS total_subscriptions
      FROM customer_subscription;
    `)
    const sStats = subStats.rows?.[0] || {}

    // 3. Webinar & Entitlement Metrics
    const webinarStats = await pgConnection.raw(`
      SELECT 
        COUNT(id) AS total_webinars,
        COUNT(CASE WHEN event_date >= NOW() AND status != 'archived' THEN 1 END) AS upcoming_live_webinars,
        COUNT(CASE WHEN status = 'published' THEN 1 END) AS published_webinars
      FROM webinar
      WHERE deleted_at IS NULL;
    `)
    const wStats = webinarStats.rows?.[0] || {}

    const entitlementStats = await pgConnection.raw(`
      SELECT COUNT(id) AS total_registrations
      FROM customer_entitlement
      WHERE status = 'active';
    `)
    const totalRegistrations = parseInt(entitlementStats.rows?.[0]?.total_registrations || "0", 10)

    // 4. Financial & Order Metrics
    const orderStats = await pgConnection.raw(`
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
      WHERE o.deleted_at IS NULL;
    `)
    const oStats = orderStats.rows?.[0] || {}

    // 5. Open Monitoring Incidents Count
    const incidentStats = await pgConnection.raw(`
      SELECT COUNT(DISTINCT id) as open_incidents
      FROM order_monitoring_incident
      WHERE status IN ('new', 'investigating', 'awaiting_payment_verification');
    `)
    const openIncidents = parseInt(incidentStats.rows?.[0]?.open_incidents || "0", 10)

    // 6. Time Series: Revenue & Orders Daily (Last 14 days)
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

    // 7. Time Series: Customer Signups & Entitlements Daily (Last 14 days)
    const growthTrend = await pgConnection.raw(`
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
        COUNT(DISTINCT c.id) as new_customers,
        COUNT(DISTINCT ce.id) as new_registrations
      FROM date_series ds
      LEFT JOIN customer c ON date_trunc('day', c.created_at)::date = ds.day AND c.deleted_at IS NULL
      LEFT JOIN customer_entitlement ce ON date_trunc('day', ce.created_at)::date = ds.day AND ce.status = 'active'
      GROUP BY ds.day
      ORDER BY ds.day ASC;
    `)

    // 8. Recent Orders (Top 6)
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
        ) as items
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      LEFT JOIN customer c ON c.id = o.customer_id
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 6;
    `)

    // 9. Recent Customer Registrations (Top 6)
    const recentCustomersResult = await pgConnection.raw(`
      SELECT 
        c.id,
        c.email,
        c.first_name,
        c.last_name,
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) as full_name,
        COALESCE(c.company_name, c.metadata->>'company_name') as company_name,
        c.metadata->>'ptin' as ptin,
        c.metadata->>'cfp_id' as cfp_id,
        COALESCE(c.metadata->>'license_type', 'CPA') as license_type,
        COALESCE(c.metadata->>'account_status', 'active') as account_status,
        c.created_at
      FROM customer c
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT 6;
    `)

    // 10. Upcoming Live Webinars (Top 5)
    const upcomingWebinarsResult = await pgConnection.raw(`
      SELECT 
        w.id,
        w.title,
        w.slug,
        w.event_date,
        w.start_time,
        w.end_time,
        w.timezone as time_zone,
        w.cpe_credits,
        w.category,
        w.status,
        COALESCE(s.name, w.speaker_name) as speaker_name,
        COUNT(ce.id) as registrations_count
      FROM webinar w
      LEFT JOIN speaker s ON s.id = w.speaker_id
      LEFT JOIN customer_entitlement ce ON ce.webinar_id = w.id AND ce.status = 'active'
      WHERE w.deleted_at IS NULL AND w.event_date >= NOW() - INTERVAL '1 day' AND w.status != 'archived'
      GROUP BY w.id, s.name, w.speaker_name
      ORDER BY w.event_date ASC
      LIMIT 5;
    `)

    // 11. Monitoring Settings
    const settingsRes = await pgConnection.raw(`
      SELECT key, value FROM order_monitoring_setting;
    `)
    const settings: Record<string, string> = {}
    for (const r of settingsRes.rows || []) {
      settings[r.key] = r.value
    }

    res.json({
      metrics: {
        total_customers: parseInt(cStats.total_customers || "0", 10),
        new_customers_30d: parseInt(cStats.new_customers_30d || "0", 10),
        new_customers_7d: parseInt(cStats.new_customers_7d || "0", 10),
        active_accounts: parseInt(cStats.active_accounts || "0", 10),
        inactive_accounts: parseInt(cStats.inactive_accounts || "0", 10),
        suspended_accounts: parseInt(cStats.suspended_accounts || "0", 10),

        active_subscriptions: parseInt(sStats.active_subscriptions || "0", 10),
        expired_subscriptions: parseInt(sStats.expired_subscriptions || "0", 10),
        total_subscriptions: parseInt(sStats.total_subscriptions || "0", 10),

        total_webinars: parseInt(wStats.total_webinars || "0", 10),
        upcoming_live_webinars: parseInt(wStats.upcoming_live_webinars || "0", 10),
        total_registrations: totalRegistrations,

        total_orders: parseInt(oStats.total_orders || "0", 10),
        orders_today: parseInt(oStats.orders_today || "0", 10),
        paid_orders: parseInt(oStats.paid_orders || "0", 10),
        pending_orders: parseInt(oStats.pending_orders || "0", 10),
        canceled_orders: parseInt(oStats.canceled_orders || "0", 10),
        total_revenue: parseFloat(oStats.total_revenue || "0"),
        average_order_value: parseFloat(oStats.average_order_value || "0"),
        open_incidents: openIncidents,
      },
      chart_revenue: trendResult.rows || [],
      chart_growth: growthTrend.rows || [],
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
      recent_customers: recentCustomersResult.rows || [],
      upcoming_webinars: (upcomingWebinarsResult.rows || []).map((w: any) => ({
        ...w,
        registrations_count: parseInt(w.registrations_count || "0", 10),
      })),
      monitoring: {
        last_reconciliation_at: settings.last_reconciliation_at || null,
        alert_recipient_email: settings.alert_recipient_email || "support@academyio.com",
        open_incidents_count: openIncidents,
      },
    })
  } catch (error: any) {
    console.error("[Admin Overview API Error]:", error)
    res.status(500).json({
      message: "Failed to load comprehensive overview data",
      error: error.message,
    })
  }
}
