import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSharedPool } from "../../../utils/db-pool"
import crypto from "crypto"

const pool = getSharedPool()

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.query as Record<string, any>
  const limit = Math.min(Math.max(parseInt(query.limit as string) || 25, 1), 100)
  const offset = Math.max(parseInt(query.offset as string) || 0, 0)
  const q = (query.q as string || "").trim().toLowerCase()
  const statusFilter = (query.status as string || "all").toLowerCase()
  const subscriptionFilter = (query.subscription_status as string || "all").toLowerCase()
  const designationFilter = (query.designation as string || "all").toUpperCase()
  const sortBy = (query.sort_by as string || "created_at").toLowerCase()
  const sortOrder = (query.sort_order as string || "desc").toLowerCase() === "asc" ? "ASC" : "DESC"

  const client = await pool.connect()
  try {
    // 1. Fetch Global Summary Metrics
    const metricsRes = await client.query(`
      SELECT 
        COUNT(DISTINCT c.id) AS total_customers,
        COUNT(DISTINCT CASE WHEN COALESCE(c.metadata->>'account_status', 'active') = 'active' THEN c.id END) AS active_count,
        COUNT(DISTINCT CASE WHEN c.metadata->>'account_status' = 'inactive' THEN c.id END) AS inactive_count,
        COUNT(DISTINCT CASE WHEN c.metadata->>'account_status' = 'suspended' THEN c.id END) AS suspended_count,
        COUNT(DISTINCT CASE WHEN sub.status = 'active' THEN c.id END) AS subscribed_count,
        COUNT(DISTINCT o.id) AS total_orders
      FROM customer c
      LEFT JOIN "order" o ON (o.customer_id = c.id OR LOWER(o.email) = LOWER(c.email)) AND o.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT status 
        FROM customer_subscription 
        WHERE (customer_id = c.id OR LOWER(customer_email) = LOWER(c.email)) AND status = 'active'
        LIMIT 1
      ) sub ON true
      WHERE c.deleted_at IS NULL;
    `)
    const rawMetrics = metricsRes.rows[0] || {}

    // 2. Build Dynamic Where Clauses
    const conditions: string[] = ["c.deleted_at IS NULL"]
    const params: any[] = []

    if (q) {
      params.push(`%${q}%`)
      const pIdx = params.length
      conditions.push(`(
        LOWER(COALESCE(c.first_name, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(c.last_name, '')) LIKE $${pIdx} OR
        LOWER(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) LIKE $${pIdx} OR
        LOWER(COALESCE(c.email, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(c.phone, c.metadata->>'phone', '')) LIKE $${pIdx} OR
        LOWER(COALESCE(c.company_name, c.metadata->>'company_name', '')) LIKE $${pIdx} OR
        LOWER(COALESCE(c.metadata->>'ptin', '')) LIKE $${pIdx} OR
        LOWER(COALESCE(c.metadata->>'cfp_id', '')) LIKE $${pIdx}
      )`)
    }

    if (statusFilter !== "all") {
      params.push(statusFilter)
      conditions.push(`COALESCE(c.metadata->>'account_status', 'active') = $${params.length}`)
    }

    if (designationFilter !== "ALL") {
      if (designationFilter === "EA") {
        conditions.push(`(c.metadata->>'ptin' IS NOT NULL AND c.metadata->>'ptin' != '' OR c.metadata->>'license_type' = 'EA')`)
      } else if (designationFilter === "CFP") {
        conditions.push(`(c.metadata->>'cfp_id' IS NOT NULL AND c.metadata->>'cfp_id' != '' OR c.metadata->>'license_type' = 'CFP')`)
      } else if (designationFilter === "CPA") {
        conditions.push(`(c.metadata->>'license_type' = 'CPA')`)
      }
    }

    if (subscriptionFilter !== "all") {
      if (subscriptionFilter === "active") {
        conditions.push(`sub.status = 'active'`)
      } else if (subscriptionFilter === "none") {
        conditions.push(`(sub.status IS NULL OR sub.status NOT IN ('active', 'past_due'))`)
      } else if (subscriptionFilter === "canceled" || subscriptionFilter === "expired") {
        params.push(subscriptionFilter)
        conditions.push(`sub.status = $${params.length}`)
      }
    }

    const whereClause = conditions.join(" AND ")

    // 3. Determine Ordering
    let orderExpression = "c.created_at DESC"
    if (sortBy === "name") {
      orderExpression = `COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), c.email) ${sortOrder}`
    } else if (sortBy === "orders") {
      orderExpression = `total_orders ${sortOrder}, c.created_at DESC`
    } else if (sortBy === "last_login") {
      orderExpression = `last_login_at ${sortOrder} NULLS LAST, c.created_at DESC`
    } else {
      orderExpression = `c.created_at ${sortOrder}`
    }

    // 4. Count Matching Records
    const countSql = `
      SELECT COUNT(DISTINCT c.id) AS total_count
      FROM customer c
      LEFT JOIN LATERAL (
        SELECT status, plan_name, current_period_end
        FROM customer_subscription
        WHERE (customer_id = c.id OR LOWER(customer_email) = LOWER(c.email))
        ORDER BY CASE WHEN status = 'active' THEN 1 ELSE 2 END, created_at DESC
        LIMIT 1
      ) sub ON true
      WHERE ${whereClause}
    `
    const countRes = await client.query(countSql, params)
    const totalCount = parseInt(countRes.rows[0]?.total_count || "0")

    // 5. Query Filtered Customers
    const limitParamIdx = params.length + 1
    const offsetParamIdx = params.length + 2
    params.push(limit, offset)

    const listSql = `
      SELECT 
        c.id,
        c.email,
        c.first_name,
        c.last_name,
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS full_name,
        COALESCE(c.phone, c.metadata->>'phone') AS phone,
        COALESCE(c.company_name, c.metadata->>'company_name') AS company_name,
        c.has_account,
        c.metadata,
        c.created_at,
        c.updated_at,
        COALESCE(c.metadata->>'account_status', 'active') AS account_status,
        c.metadata->>'last_login_at' AS last_login_at,
        c.metadata->>'ptin' AS ptin,
        c.metadata->>'cfp_id' AS cfp_id,
        COALESCE(c.metadata->>'license_type', CASE WHEN c.metadata->>'ptin' IS NOT NULL THEN 'EA' ELSE 'General' END) AS license_type,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(DISTINCT CASE WHEN o.status != 'canceled' THEN 1 ELSE 0 END), 0) AS completed_orders,
        sub.status AS subscription_status,
        sub.plan_name AS subscription_plan_name,
        sub.current_period_end AS subscription_period_end,
        COUNT(DISTINCT ce.id) AS entitlements_count,
        ai.id AS auth_id,
        CASE WHEN pi.id IS NOT NULL THEN true ELSE false END AS has_password
      FROM customer c
      LEFT JOIN "order" o ON (o.customer_id = c.id OR LOWER(o.email) = LOWER(c.email)) AND o.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT status, plan_name, current_period_end
        FROM customer_subscription
        WHERE (customer_id = c.id OR LOWER(customer_email) = LOWER(c.email))
        ORDER BY CASE WHEN status = 'active' THEN 1 ELSE 2 END, created_at DESC
        LIMIT 1
      ) sub ON true
      LEFT JOIN customer_entitlement ce ON (ce.customer_id = c.id OR LOWER(ce.customer_email) = LOWER(c.email)) AND ce.status = 'active'
      LEFT JOIN auth_identity ai ON (ai.app_metadata->>'customer_id' = c.id AND ai.deleted_at IS NULL)
      LEFT JOIN provider_identity pi ON (pi.auth_identity_id = ai.id AND pi.provider = 'emailpass' AND pi.deleted_at IS NULL)
      WHERE ${whereClause}
      GROUP BY c.id, sub.status, sub.plan_name, sub.current_period_end, ai.id, pi.id
      ORDER BY ${orderExpression}
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `
    const listRes = await client.query(listSql, params)

    const customers = listRes.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: row.full_name || row.email,
      phone: row.phone,
      company_name: row.company_name,
      has_account: Boolean(row.has_account || row.auth_id),
      has_password: Boolean(row.has_password),
      account_status: row.account_status,
      last_login_at: row.last_login_at,
      ptin: row.ptin,
      cfp_id: row.cfp_id,
      license_type: row.license_type,
      total_orders: parseInt(row.total_orders || "0"),
      completed_orders: parseInt(row.completed_orders || "0"),
      subscription_status: row.subscription_status || "none",
      subscription_plan_name: row.subscription_plan_name || null,
      subscription_period_end: row.subscription_period_end || null,
      entitlements_count: parseInt(row.entitlements_count || "0"),
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))

    res.json({
      customers,
      count: totalCount,
      limit,
      offset,
      metrics: {
        total: parseInt(rawMetrics.total_customers || "0"),
        active: parseInt(rawMetrics.active_count || "0"),
        inactive: parseInt(rawMetrics.inactive_count || "0"),
        suspended: parseInt(rawMetrics.suspended_count || "0"),
        subscribed: parseInt(rawMetrics.subscribed_count || "0"),
        total_orders: parseInt(rawMetrics.total_orders || "0"),
      },
    })
  } catch (error: any) {
    console.error("Error in /admin/customers-directory GET:", error)
    res.status(500).json({ message: "Failed to load customers", error: error.message })
  } finally {
    client.release()
  }
}
