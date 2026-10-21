import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const query = req.query as Record<string, any>

    const search = (query.q as string || "").trim().toLowerCase()
    const paymentStatusFilter = (query.payment_status as string || "all").toLowerCase()
    const orderStatusFilter = (query.order_status as string || "all").toLowerCase()
    const dateRange = (query.date_range as string || "all").toLowerCase()
    const specificDate = (query.specific_date as string || "").trim()
    const fromDate = (query.from_date as string || "").trim()
    const toDate = (query.to_date as string || "").trim()
    const requiringAttention = query.requiring_attention === "true"
    const sortBy = (query.sort_by as string || "newest").toLowerCase()

    const conditions: string[] = ["o.deleted_at IS NULL"]
    const bindings: any[] = []

    // 1. Search Query
    if (search) {
      conditions.push(`(
        LOWER(o.id) LIKE ? OR
        CAST(o.display_id AS text) LIKE ? OR
        LOWER(COALESCE(o.email, '')) LIKE ? OR
        LOWER(COALESCE(c.first_name, '')) LIKE ? OR
        LOWER(COALESCE(c.last_name, '')) LIKE ?
      )`)
      const pattern = `%${search}%`
      bindings.push(pattern, pattern, pattern, pattern, pattern)
    }

    // 2. Day-wise & Date Filtering
    if (specificDate) {
      conditions.push("TO_CHAR(o.created_at, 'YYYY-MM-DD') = ?")
      bindings.push(specificDate)
    } else if (fromDate && toDate) {
      conditions.push("TO_CHAR(o.created_at, 'YYYY-MM-DD') >= ? AND TO_CHAR(o.created_at, 'YYYY-MM-DD') <= ?")
      bindings.push(fromDate, toDate)
    } else if (fromDate) {
      conditions.push("TO_CHAR(o.created_at, 'YYYY-MM-DD') >= ?")
      bindings.push(fromDate)
    } else if (toDate) {
      conditions.push("TO_CHAR(o.created_at, 'YYYY-MM-DD') <= ?")
      bindings.push(toDate)
    } else if (dateRange === "today") {
      conditions.push("TO_CHAR(o.created_at, 'YYYY-MM-DD') = TO_CHAR(now(), 'YYYY-MM-DD')")
    } else if (dateRange === "yesterday") {
      conditions.push("TO_CHAR(o.created_at, 'YYYY-MM-DD') = TO_CHAR(now() - interval '1 day', 'YYYY-MM-DD')")
    } else if (dateRange === "7d") {
      conditions.push("o.created_at >= now() - interval '7 days'")
    } else if (dateRange === "30d") {
      conditions.push("o.created_at >= now() - interval '30 days'")
    }

    // 3. Order Status
    if (orderStatusFilter !== "all") {
      conditions.push("o.status = ?")
      bindings.push(orderStatusFilter)
    }

    // 4. Payment Status Filter
    if (paymentStatusFilter === "paid") {
      conditions.push("(o.status = 'completed' OR COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) >= COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 1))")
    } else if (paymentStatusFilter === "pending") {
      conditions.push("COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) = 0 AND o.status != 'canceled'")
    } else if (paymentStatusFilter === "failed") {
      conditions.push("(o.status = 'canceled' OR EXISTS (SELECT 1 FROM payment p_f JOIN order_payment_collection opc_f ON opc_f.order_id = o.id WHERE p_f.payment_collection_id = opc_f.payment_collection_id AND p_f.canceled_at IS NOT NULL))")
    } else if (paymentStatusFilter === "refunded") {
      conditions.push("COALESCE(CAST(s.totals->>'refunded_total' AS numeric), 0) > 0")
    }

    // 5. Requiring Attention Filter
    if (requiringAttention) {
      conditions.push(`(
        EXISTS (
          SELECT 1 FROM order_monitoring_incident omi
          WHERE omi.order_id = o.id AND omi.status IN ('new', 'investigating', 'awaiting_payment_verification')
        )
        OR
        (
          (o.status = 'completed' OR COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) >= COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 1))
          AND NOT EXISTS (
            SELECT 1 FROM customer_entitlement ce_att
            WHERE ce_att.order_id = o.id AND ce_att.status = 'active'
          )
        )
      )`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    let orderBySql = "o.created_at DESC"
    if (sortBy === "oldest") {
      orderBySql = "o.created_at ASC"
    } else if (sortBy === "amount_desc") {
      orderBySql = "COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 0) DESC"
    } else if (sortBy === "amount_asc") {
      orderBySql = "COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 0) ASC"
    }

    // Fetch all matching orders (up to 10,000) for CSV export
    const listSql = `
      SELECT 
        o.id,
        o.display_id,
        o.status as order_status,
        o.email as customer_email,
        o.currency_code,
        o.created_at,
        TO_CHAR(o.created_at, 'YYYY-MM-DD') as order_date,
        TO_CHAR(o.created_at, 'HH24:MI:SS') as order_time,
        TO_CHAR(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as order_utc_time,
        c.first_name,
        c.last_name,
        c.phone as customer_phone,
        COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 0) as order_total,
        COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) as paid_total,
        COALESCE(CAST(s.totals->>'refunded_total' AS numeric), 0) as refunded_total,
        (
          SELECT json_agg(json_build_object(
            'id', oli.id,
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
          SELECT json_agg(json_build_object(
            'id', ce.id,
            'status', ce.status,
            'access_type', ce.access_type
          ))
          FROM customer_entitlement ce
          WHERE ce.order_id = o.id
        ) as entitlements,
        (
          SELECT json_agg(json_build_object(
            'id', omi.id,
            'description', omi.description
          ))
          FROM order_monitoring_incident omi
          WHERE omi.order_id = o.id
        ) as incidents
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      LEFT JOIN customer c ON c.id = o.customer_id
      ${whereClause}
      ORDER BY ${orderBySql}
      LIMIT 10000;
    `

    const listResult = await pgConnection.raw(listSql, bindings)

    const csvHeaders = [
      "Order ID",
      "Display ID",
      "Order Date",
      "Order Time",
      "Order UTC Timestamp",
      "Customer Full Name",
      "Customer Email",
      "Customer Phone",
      "Order Status",
      "Payment Status",
      "Total Amount",
      "Paid Amount",
      "Refunded Amount",
      "Currency",
      "Purchased Items Summary",
      "Total Units",
      "Digital Webinar Access",
      "Needs Attention",
      "Monitoring Notes"
    ]

    const csvRows = (listResult.rows || []).map((o: any) => {
      const customerName = [o.first_name, o.last_name].filter(Boolean).join(" ") || "Customer"
      const totalNum = parseFloat(o.order_total) || 0
      const paidNum = parseFloat(o.paid_total) || 0
      const refundedNum = parseFloat(o.refunded_total) || 0

      let paymentStatus = "Pending"
      if (refundedNum > 0) {
        paymentStatus = "Refunded"
      } else if (paidNum >= totalNum && totalNum > 0) {
        paymentStatus = "Paid"
      } else if (o.order_status === "canceled") {
        paymentStatus = "Canceled"
      } else if (paidNum > 0) {
        paymentStatus = "Partially Paid"
      }

      const activeEnts = (o.entitlements || []).filter((e: any) => e.status === "active")
      let accessStatus = "Pending Activation"
      if (activeEnts.length > 0) {
        accessStatus = "Access Active"
      } else if (paymentStatus === "Paid") {
        accessStatus = "Missing Entitlement"
      }

      const itemsSummary = (o.items || []).map((it: any) => `${it.title || "Item"} (${it.variant_title || "Standard"}) x${it.quantity}`).join("; ")
      const totalUnits = (o.items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0)
      const attentionNotes = (o.incidents || []).map((inc: any) => inc.description).join("; ")
      const hasAttention = accessStatus === "Missing Entitlement" || (o.incidents || []).length > 0

      return [
        `"${o.id}"`,
        `"#${o.display_id}"`,
        `"${o.order_date}"`,
        `"${o.order_time}"`,
        `"${o.order_utc_time}"`,
        `"${customerName.replace(/"/g, '""')}"`,
        `"${o.customer_email || ""}"`,
        `"${o.customer_phone || ""}"`,
        `"${o.order_status}"`,
        `"${paymentStatus}"`,
        totalNum.toFixed(2),
        paidNum.toFixed(2),
        refundedNum.toFixed(2),
        `"${(o.currency_code || "USD").toUpperCase()}"`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        totalUnits,
        `"${accessStatus}"`,
        hasAttention ? "YES" : "NO",
        `"${attentionNotes.replace(/"/g, '""')}"`
      ].join(",")
    })

    const dateLabel = specificDate || (fromDate && toDate ? `${fromDate}_to_${toDate}` : dateRange !== "all" ? dateRange : new Date().toISOString().split("T")[0])
    const csvContent = "\uFEFF" + [csvHeaders.join(","), ...csvRows].join("\r\n")

    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename="academyio_orders_${dateLabel}.csv"`)
    return res.status(200).send(csvContent)
  } catch (error: any) {
    console.error("[Orders Export Error]:", error)
    return res.status(500).json({
      message: "Failed to generate CSV export",
      error: error.message,
    })
  }
}
