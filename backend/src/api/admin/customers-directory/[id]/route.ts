import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSharedPool } from "../../../../utils/db-pool"
import crypto from "crypto"

const pool = getSharedPool()

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const client = await pool.connect()

  try {
    // 1. Fetch customer profile and auth status
    const custRes = await client.query(
      `SELECT 
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
        ai.id AS auth_id,
        ai.updated_at AS auth_updated_at,
        CASE WHEN pi.id IS NOT NULL THEN true ELSE false END AS has_password,
        pi.updated_at AS password_updated_at
       FROM customer c
       LEFT JOIN auth_identity ai ON (ai.app_metadata->>'customer_id' = c.id AND ai.deleted_at IS NULL)
       LEFT JOIN provider_identity pi ON (pi.auth_identity_id = ai.id AND pi.provider = 'emailpass' AND pi.deleted_at IS NULL)
       WHERE c.id = $1 AND c.deleted_at IS NULL
       LIMIT 1;`,
      [id]
    )

    if (custRes.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" })
    }

    const customer = custRes.rows[0]
    const customerEmail = customer.email?.toLowerCase()

    // 2. Fetch Orders for this customer
    const ordersRes = await client.query(
      `SELECT 
        o.id,
        o.display_id,
        o.status,
        o.currency_code,
        o.created_at,
        o.canceled_at,
        COUNT(oi.id) AS items_count,
        COALESCE(ot.amount, 0) AS total_amount
       FROM "order" o
       LEFT JOIN order_item oi ON oi.order_id = o.id
       LEFT JOIN LATERAL (
         SELECT SUM(amount) AS amount FROM order_transaction WHERE order_id = o.id
       ) ot ON true
       WHERE (o.customer_id = $1 OR LOWER(o.email) = $2) AND o.deleted_at IS NULL
       GROUP BY o.id, o.display_id, o.status, o.currency_code, o.created_at, o.canceled_at, ot.amount
       ORDER BY o.created_at DESC;`,
      [id, customerEmail]
    )

    // 3. Fetch Webinar Registrations & Entitlements
    const entitlementsRes = await client.query(
      `SELECT 
        ce.id,
        ce.order_id,
        ce.access_type,
        ce.status,
        ce.variant_title,
        ce.granted_at,
        ce.expires_at,
        ce.metadata,
        w.id AS webinar_id,
        w.title AS webinar_title,
        w.slug AS webinar_slug,
        w.event_date AS webinar_date,
        w.category AS webinar_category,
        w.cpe_credits AS webinar_credits
       FROM customer_entitlement ce
       LEFT JOIN webinar w ON w.id = ce.webinar_id
       WHERE (ce.customer_id = $1 OR LOWER(ce.customer_email) = $2)
       ORDER BY ce.created_at DESC;`,
      [id, customerEmail]
    )

    // 4. Fetch Subscriptions
    const subsRes = await client.query(
      `SELECT 
        cs.id,
        cs.plan_id,
        cs.plan_name,
        cs.status,
        cs.current_period_start,
        cs.current_period_end,
        cs.cancel_at_period_end,
        cs.monthly_access_used,
        cs.payment_provider_id,
        cs.payment_method_summary,
        cs.created_at,
        sp.price AS plan_price,
        sp.billing_interval AS plan_interval,
        sp.webinar_access_limit AS plan_limit
       FROM customer_subscription cs
       LEFT JOIN subscription_plan sp ON sp.id = cs.plan_id
       WHERE (cs.customer_id = $1 OR LOWER(cs.customer_email) = $2)
       ORDER BY cs.created_at DESC;`,
      [id, customerEmail]
    )

    // 5. Fetch Learning Materials & Certificates
    const certsRes = await client.query(
      `SELECT 
        wc.id,
        wc.certificate_number,
        wc.cpe_credits,
        wc.score_percentage AS score,
        wc.issue_date AS issued_at,
        COALESCE(wc.metadata->>'pdf_url', wc.metadata->>'download_url') AS pdf_url,
        w.id AS webinar_id,
        w.title AS webinar_title,
        w.slug AS webinar_slug
       FROM webinar_certificate wc
       LEFT JOIN webinar w ON w.id = wc.webinar_id
       WHERE (wc.customer_id = $1 OR LOWER(wc.customer_email) = $2)
       ORDER BY wc.issue_date DESC;`,
      [id, customerEmail]
    )

    // 6. Fetch Recent Password Reset Tokens
    const resetsRes = await client.query(
      `SELECT id, email, created_at, expires_at, used_at,
              CASE WHEN used_at IS NOT NULL THEN 'used'
                   WHEN expires_at < NOW() THEN 'expired'
                   ELSE 'active' END AS token_status
       FROM customer_password_reset
       WHERE (customer_id = $1 OR LOWER(email) = $2)
       ORDER BY created_at DESC
       LIMIT 5;`,
      [id, customerEmail]
    )

    // 7. Fetch Customer Audit Logs
    const auditRes = await client.query(
      `SELECT id, admin_id, admin_email, action, details, ip_address, created_at
       FROM customer_audit_log
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT 20;`,
      [id]
    )

    res.json({
      customer: {
        ...customer,
        orders: ordersRes.rows,
        entitlements: entitlementsRes.rows,
        subscriptions: subsRes.rows,
        certificates: certsRes.rows,
        password_resets: resetsRes.rows,
        audit_logs: auditRes.rows,
      },
    })
  } catch (error: any) {
    console.error("Error in /admin/customers-directory/[id] GET:", error)
    res.status(500).json({ message: "Failed to load customer profile", error: error.message })
  } finally {
    client.release()
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const body = req.body as Record<string, any>
  const client = await pool.connect()

  try {
    // 1. Verify customer exists
    const existingRes = await client.query(
      `SELECT id, email, first_name, last_name, phone, company_name, metadata
       FROM customer
       WHERE id = $1 AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    )

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" })
    }

    const existing = existingRes.rows[0]
    const changes: Record<string, any> = {}

    // 2. Validate email uniqueness if changing email
    let newEmail = existing.email
    if (body.email && body.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      newEmail = body.email.trim().toLowerCase()
      const emailDupCheck = await client.query(
        `SELECT id FROM customer WHERE LOWER(email) = LOWER($1) AND id != $2 AND deleted_at IS NULL LIMIT 1`,
        [newEmail, id]
      )
      if (emailDupCheck.rows.length > 0) {
        return res.status(400).json({ message: "Email address is already in use by another account." })
      }
      changes.email = { from: existing.email, to: newEmail }
    }

    // 3. Validate PTIN format if provided
    let ptin = body.ptin !== undefined ? (body.ptin ? String(body.ptin).trim().toUpperCase() : null) : existing.metadata?.ptin
    if (ptin && !/^P\d{8}$/.test(ptin)) {
      return res.status(400).json({
        message: "Invalid PTIN format. Must start with 'P' followed by 8 digits (e.g. P12345678).",
      })
    }
    if (ptin !== existing.metadata?.ptin) {
      changes.ptin = { from: existing.metadata?.ptin, to: ptin }
    }

    // 4. Validate and sanitize other profile fields
    const firstName = body.first_name !== undefined ? (body.first_name ? String(body.first_name).trim() : null) : existing.first_name
    const lastName = body.last_name !== undefined ? (body.last_name ? String(body.last_name).trim() : null) : existing.last_name
    const phone = body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : existing.phone
    const companyName = body.company_name !== undefined ? (body.company_name ? String(body.company_name).trim() : null) : existing.company_name
    const cfpId = body.cfp_id !== undefined ? (body.cfp_id ? String(body.cfp_id).trim() : null) : existing.metadata?.cfp_id
    const licenseType = body.license_type !== undefined ? (body.license_type ? String(body.license_type).trim() : null) : existing.metadata?.license_type
    const accountStatus = body.account_status !== undefined ? body.account_status : (existing.metadata?.account_status || "active")

    if (body.account_status && body.account_status !== (existing.metadata?.account_status || "active")) {
      changes.account_status = { from: existing.metadata?.account_status || "active", to: body.account_status }
    }

    // 5. Update Metadata JSON
    const updatedMetadata = {
      ...(existing.metadata || {}),
      ptin,
      cfp_id: cfpId,
      license_type: licenseType,
      account_status: accountStatus,
      company_name: companyName,
      phone,
    }

    // 6. Update Customer record
    await client.query(
      `UPDATE customer
       SET first_name = $1,
           last_name = $2,
           email = $3,
           phone = $4,
           company_name = $5,
           metadata = $6,
           updated_at = NOW()
       WHERE id = $7`,
      [firstName, lastName, newEmail, phone, companyName, JSON.stringify(updatedMetadata), id]
    )

    // 7. If email changed, synchronize provider_identity and customer data
    if (newEmail !== existing.email) {
      await client.query(
        `UPDATE provider_identity pi
         SET entity_id = $1, updated_at = NOW()
         FROM auth_identity ai
         WHERE pi.auth_identity_id = ai.id
           AND ai.app_metadata->>'customer_id' = $2
           AND pi.provider = 'emailpass'`,
        [newEmail, id]
      )
      await client.query(`UPDATE customer_entitlement SET customer_email = $1 WHERE customer_id = $2`, [newEmail, id])
      await client.query(`UPDATE customer_subscription SET customer_email = $1 WHERE customer_id = $2`, [newEmail, id])
      await client.query(`UPDATE customer_password_reset SET email = $1 WHERE customer_id = $2`, [newEmail, id])
    }

    // 8. Record audit log
    const adminUser = (req as any).auth_context?.actor_id || "admin"
    const logId = "cal_" + crypto.randomBytes(12).toString("hex")
    await client.query(
      `INSERT INTO customer_audit_log (id, customer_id, admin_id, admin_email, action, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        logId,
        id,
        adminUser,
        "admin@academyio.com",
        changes.account_status ? "STATUS_CHANGED" : "PROFILE_UPDATED",
        JSON.stringify({ changes }),
      ]
    )

    res.json({
      success: true,
      message: "Customer profile updated successfully",
      customer: {
        id,
        first_name: firstName,
        last_name: lastName,
        email: newEmail,
        phone,
        company_name: companyName,
        account_status: accountStatus,
        metadata: updatedMetadata,
      },
    })
  } catch (error: any) {
    console.error("Error in /admin/customers-directory/[id] POST:", error)
    res.status(500).json({ message: "Failed to update customer", error: error.message })
  } finally {
    client.release()
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const client = await pool.connect()

  try {
    const custRes = await client.query(`SELECT id, email FROM customer WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, [id])
    if (custRes.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" })
    }
    const customer = custRes.rows[0]
    const customerEmail = customer.email?.toLowerCase()

    await client.query("BEGIN")

    // 1. Unlink existing orders so financial records and accounting history remain safe
    await client.query(`UPDATE "order" SET customer_id = NULL WHERE customer_id = $1`, [id])

    // 2. Unlink carts
    await client.query(`UPDATE cart SET customer_id = NULL WHERE customer_id = $1`, [id])

    // 3. Clean up customer specific tables
    await client.query(
      `DELETE FROM customer_entitlement WHERE customer_id = $1 OR LOWER(customer_email) = $2`,
      [id, customerEmail]
    )
    await client.query(
      `DELETE FROM customer_subscription WHERE customer_id = $1 OR LOWER(customer_email) = $2`,
      [id, customerEmail]
    )
    await client.query(
      `DELETE FROM customer_password_reset WHERE customer_id = $1 OR LOWER(email) = $2`,
      [id, customerEmail]
    )
    await client.query(`DELETE FROM quiz_attempt WHERE customer_id = $1`, [id])
    await client.query(`DELETE FROM webinar_certificate WHERE customer_id = $1`, [id])
    await client.query(`DELETE FROM customer_account_holder WHERE customer_id = $1`, [id])

    // 4. Remove provider & auth identities
    await client.query(
      `DELETE FROM provider_identity WHERE auth_identity_id IN (
         SELECT id FROM auth_identity WHERE app_metadata->>'customer_id' = $1
       )`,
      [id]
    )
    await client.query(
      `DELETE FROM auth_identity WHERE app_metadata->>'customer_id' = $1`,
      [id]
    )

    // 5. Soft-delete and attempt hard-delete
    await client.query(`UPDATE customer SET deleted_at = NOW() WHERE id = $1`, [id])
    try {
      await client.query(`DELETE FROM customer WHERE id = $1`, [id])
    } catch (ignoreErr) {
      // Soft-delete is active
    }

    // 6. Record audit log
    const logId = "cal_" + crypto.randomBytes(12).toString("hex")
    await client.query(
      `INSERT INTO customer_audit_log (id, customer_id, admin_email, action, details, created_at)
       VALUES ($1, $2, 'admin@academyio.com', 'CUSTOMER_DELETED', $3, NOW())`,
      [logId, id, JSON.stringify({ email: customer.email, deleted_at: new Date().toISOString() })]
    )

    await client.query("COMMIT")

    res.json({
      success: true,
      message: `Customer account ${customer.email} has been permanently deleted.`,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error in /admin/customers-directory/[id] DELETE:", error)
    res.status(500).json({ message: "Failed to delete customer", error: error.message })
  } finally {
    client.release()
  }
}
