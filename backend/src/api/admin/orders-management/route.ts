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
    const isExport = query.export === "csv" || query.export === "true"
    const limit = isExport ? 10000 : Math.min(parseInt(query.limit as string || "25", 10), 100)
    const offset = isExport ? 0 : Math.max(parseInt(query.offset as string || "0", 10), 0)

    const conditions: string[] = ["o.deleted_at IS NULL"]
    const bindings: any[] = []

    // 1. Search Query
    if (search) {
      conditions.push(`(
        LOWER(o.id) LIKE ? OR
        CAST(o.display_id AS text) LIKE ? OR
        LOWER(COALESCE(o.email, '')) LIKE ? OR
        LOWER(COALESCE(c.first_name, '')) LIKE ? OR
        LOWER(COALESCE(c.last_name, '')) LIKE ? OR
        EXISTS (
          SELECT 1 FROM order_item oi_s
          JOIN order_line_item oli_s ON oli_s.id = oi_s.item_id
          WHERE oi_s.order_id = o.id AND (LOWER(oli_s.title) LIKE ? OR LOWER(COALESCE(oli_s.variant_title, '')) LIKE ?)
        )
      )`)
      const pattern = `%${search}%`
      bindings.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern)
    }

    // 2. Date Range & Day-wise Filtering
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
        (o.status = 'completed' OR COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) >= COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 1))
        AND NOT EXISTS (
          SELECT 1 FROM customer_entitlement ce_att
          WHERE ce_att.order_id = o.id AND ce_att.status = 'active'
        )
      )`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    // 6. Sort Order
    let orderBySql = "o.created_at DESC"
    if (sortBy === "oldest") {
      orderBySql = "o.created_at ASC"
    } else if (sortBy === "amount_desc") {
      orderBySql = "COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 0) DESC"
    } else if (sortBy === "amount_asc") {
      orderBySql = "COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 0) ASC"
    }

    // Count Total
    const countSql = `
      SELECT COUNT(o.id) as total_count
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      LEFT JOIN customer c ON c.id = o.customer_id
      ${whereClause};
    `
    const countResult = await pgConnection.raw(countSql, bindings)
    const totalCount = parseInt(countResult.rows?.[0]?.total_count || 0, 10)

    // Query Orders
    const listSql = `
      SELECT 
        o.id,
        o.display_id,
        o.status as order_status,
        o.email as customer_email,
        o.currency_code,
        o.created_at,
        o.updated_at,
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
            'unit_price', oli.unit_price,
            'product_id', oli.product_id,
            'variant_id', oli.variant_id
          ))
          FROM order_item oi
          JOIN order_line_item oli ON oli.id = oi.item_id
          WHERE oi.order_id = o.id
        ) as items,
        (
          SELECT json_agg(json_build_object(
            'id', ce.id,
            'status', ce.status,
            'access_type', ce.access_type,
            'variant_title', ce.variant_title,
            'granted_at', ce.granted_at
          ))
          FROM customer_entitlement ce
          WHERE ce.order_id = o.id
        ) as entitlements,
        '[]'::json as incidents
      FROM "order" o
      LEFT JOIN order_summary s ON s.order_id = o.id
      LEFT JOIN customer c ON c.id = o.customer_id
      ${whereClause}
      ORDER BY ${orderBySql}
      LIMIT ? OFFSET ?;
    `
    const listBindings = [...bindings, limit, offset]
    const listResult = await pgConnection.raw(listSql, listBindings)

    const orders = (listResult.rows || []).map((o: any) => {
      const customerName = [o.first_name, o.last_name].filter(Boolean).join(" ") || "Customer"
      const totalNum = parseFloat(o.order_total)
      const paidNum = parseFloat(o.paid_total)
      const refundedNum = parseFloat(o.refunded_total)

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

      // Determine fulfillment / digital access status
      const activeEnts = (o.entitlements || []).filter((e: any) => e.status === "active")
      let accessStatus = "Pending Activation"
      if (activeEnts.length > 0) {
        accessStatus = "Access Granted"
      } else if (paymentStatus === "Paid") {
        accessStatus = "Missing Entitlement ⚠️"
      }

      return {
        id: o.id,
        display_id: o.display_id,
        order_status: o.order_status,
        customer_name: customerName,
        customer_email: o.customer_email || "N/A",
        customer_phone: o.customer_phone || null,
        created_at: o.created_at,
        updated_at: o.updated_at,
        currency_code: (o.currency_code || "usd").toUpperCase(),
        order_total: totalNum,
        paid_total: paidNum,
        refunded_total: refundedNum,
        payment_status: paymentStatus,
        access_status: accessStatus,
        items: o.items || [],
        entitlements: o.entitlements || [],
        incidents: [],
        has_attention_flag: accessStatus === "Missing Entitlement ⚠️",
      }
    })

    if (query.export === "csv") {
      const csvHeaders = [
        "Order ID",
        "Display ID",
        "Order Date",
        "Order Time (UTC)",
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

      const csvRows = orders.map((o: any) => {
        const dateObj = new Date(o.created_at)
        const dateStr = dateObj.toISOString().split("T")[0]
        const timeStr = dateObj.toISOString().split("T")[1]?.replace("Z", "") || ""
        const itemsSummary = (o.items || []).map((it: any) => `${it.title || "Item"} (${it.variant_title || "Standard"}) x${it.quantity}`).join("; ")
        const totalUnits = (o.items || []).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0)
        const attentionNotes = (o.incidents || []).map((inc: any) => inc.description).join("; ")

        return [
          `"${o.id}"`,
          `"#${o.display_id}"`,
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${(o.customer_name || "Customer").replace(/"/g, '""')}"`,
          `"${o.customer_email || ""}"`,
          `"${o.customer_phone || ""}"`,
          `"${o.order_status}"`,
          `"${o.payment_status}"`,
          o.order_total.toFixed(2),
          o.paid_total.toFixed(2),
          o.refunded_total.toFixed(2),
          `"${(o.currency_code || "USD").toUpperCase()}"`,
          `"${itemsSummary.replace(/"/g, '""')}"`,
          totalUnits,
          `"${o.access_status}"`,
          o.has_attention_flag ? "YES" : "NO",
          `"${attentionNotes.replace(/"/g, '""')}"`
        ].join(",")
      })

      const dateLabel = specificDate || (fromDate && toDate ? `${fromDate}_to_${toDate}` : dateRange !== "all" ? dateRange : new Date().toISOString().split("T")[0])
      const csvContent = "\uFEFF" + [csvHeaders.join(","), ...csvRows].join("\r\n")

      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader("Content-Disposition", `attachment; filename="academyio_orders_${dateLabel}.csv"`)
      return res.status(200).send(csvContent)
    }

    // Days summary for day-picker dropdown
    let daysSummary: any[] = []
    try {
      const daysRes = await pgConnection.raw(`
        SELECT 
          TO_CHAR(o.created_at, 'YYYY-MM-DD') as day,
          COUNT(o.id) as orders_count,
          COALESCE(SUM(CAST(s.totals->>'paid_total' AS numeric)), 0) as paid_revenue
        FROM "order" o
        LEFT JOIN order_summary s ON s.order_id = o.id
        WHERE o.deleted_at IS NULL
        GROUP BY TO_CHAR(o.created_at, 'YYYY-MM-DD')
        ORDER BY day DESC
        LIMIT 30;
      `)
      daysSummary = daysRes.rows || []
    } catch (_) {}

    res.json({
      orders,
      count: totalCount,
      limit,
      offset,
      days_summary: daysSummary,
      filters: {
        search,
        payment_status: paymentStatusFilter,
        order_status: orderStatusFilter,
        date_range: dateRange,
        specific_date: specificDate || null,
        from_date: fromDate || null,
        to_date: toDate || null,
        requiring_attention: requiringAttention,
        sort_by: sortBy,
      },
    })
  } catch (error: any) {
    console.error("[Admin Orders Management API Error]:", error)
    res.status(500).json({
      message: "Failed to fetch orders management records",
      error: error.message,
    })
  }
}
