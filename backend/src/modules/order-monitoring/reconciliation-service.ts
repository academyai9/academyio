import crypto from "crypto"
import { OrderMonitoringEmailService } from "./email-service"

export interface ReconciliationResult {
  timestamp: string
  isDryRun: boolean
  totalChecked: number
  newIncidentsCount: number
  scenarios: {
    scenarioA_missingOrders: number
    scenarioB_checkoutFailed: number
    scenarioC_paymentMismatches: number
    scenarioD_missingEntitlements: number
    scenarioE_duplicates: number
  }
  detectedIncidents: any[]
}

export class OrderReconciliationService {
  /**
   * Run full reconciliation across the 5 scenarios
   */
  static async runReconciliation(
    pgConnection: any,
    options: { dryRun?: boolean; gracePeriodMinutes?: number; adminEmail?: string } = {}
  ): Promise<ReconciliationResult> {
    const isDryRun = Boolean(options.dryRun)
    const gracePeriod = options.gracePeriodMinutes || 5
    const adminEmail = options.adminEmail || "system-scheduler@academyio.com"

    const detectedIncidents: any[] = []
    let scenarioACount = 0
    let scenarioBCount = 0
    let scenarioCCount = 0
    let scenarioDCount = 0
    let scenarioECount = 0

    // -------------------------------------------------------------------------
    // Scenario A: Payment succeeded or captured, but no Medusa order exists
    // -------------------------------------------------------------------------
    try {
      const qA = await pgConnection.raw(`
        SELECT 
          p.id as payment_id,
          p.amount,
          p.currency_code,
          p.provider_id,
          p.captured_at,
          pc.id as payment_collection_id,
          pc.status as pc_status,
          c.id as cart_id,
          c.email as customer_email,
          c.created_at as cart_created_at
        FROM payment p
        JOIN payment_collection pc ON pc.id = p.payment_collection_id
        LEFT JOIN cart_payment_collection cpc ON cpc.payment_collection_id = pc.id
        LEFT JOIN cart c ON c.id = cpc.cart_id
        LEFT JOIN order_payment_collection opc ON opc.payment_collection_id = pc.id
        LEFT JOIN order_cart oc ON oc.cart_id = c.id
        WHERE (p.captured_at IS NOT NULL OR pc.status IN ('captured', 'authorized'))
          AND opc.order_id IS NULL
          AND oc.order_id IS NULL
          AND p.created_at < now() - (? * interval '1 minute')
          AND p.deleted_at IS NULL;
      `, [gracePeriod])

      for (const row of qA.rows || []) {
        scenarioACount++
        const idempotencyKey = `scenario_a_pay_${row.payment_id}`
        detectedIncidents.push({
          incident_type: "missing_order",
          severity: "critical",
          customer_name: null,
          customer_email: row.customer_email || "Unregistered Guest",
          checkout_reference: row.cart_id,
          payment_reference: row.payment_id,
          expected_order_id: null,
          order_id: null,
          webinar_title: "Purchased Webinar (Missing Order Record)",
          amount: row.amount,
          currency_code: row.currency_code || "usd",
          payment_status: row.captured_at ? "Captured" : row.pc_status,
          description: `Payment of ${row.amount} ${row.currency_code?.toUpperCase()} succeeded via ${row.provider_id} (ID: ${row.payment_id}), but no corresponding Medusa order was found in the database.`,
          detection_rule: "Payment record confirmed captured or authorized, but order_cart and order_payment_collection have no matching order record.",
          recommended_action: "Verify payment intent in payment provider dashboard and trigger Safe Order Recovery to generate order and provision access.",
          idempotency_key: idempotencyKey,
        })
      }
    } catch (err: any) {
      console.error("[Reconciliation] Error running Scenario A:", err.message)
    }

    // -------------------------------------------------------------------------
    // Scenario B: Checkout completed, but order creation failed
    // -------------------------------------------------------------------------
    try {
      const qB = await pgConnection.raw(`
        SELECT 
          c.id as cart_id,
          c.email as customer_email,
          c.completed_at,
          c.created_at,
          c.currency_code,
          pc.id as pc_id,
          pc.amount as pc_amount,
          pc.status as pc_status
        FROM cart c
        LEFT JOIN order_cart oc ON oc.cart_id = c.id
        LEFT JOIN cart_payment_collection cpc ON cpc.cart_id = c.id
        LEFT JOIN payment_collection pc ON pc.id = cpc.payment_collection_id
        WHERE c.completed_at IS NOT NULL
          AND oc.order_id IS NULL
          AND c.completed_at < now() - (? * interval '1 minute')
          AND c.deleted_at IS NULL;
      `, [gracePeriod])

      for (const row of qB.rows || []) {
        scenarioBCount++
        const idempotencyKey = `scenario_b_cart_${row.cart_id}`
        detectedIncidents.push({
          incident_type: "checkout_failed",
          severity: "high",
          customer_name: null,
          customer_email: row.customer_email || "N/A",
          checkout_reference: row.cart_id,
          payment_reference: row.pc_id || "cart_checkout_completed",
          expected_order_id: null,
          order_id: null,
          webinar_title: "Pending Webinar Checkout",
          amount: row.pc_amount || 0,
          currency_code: row.currency_code || "usd",
          payment_status: row.pc_status || "Completed Checkout",
          description: `Customer completed checkout for cart ${row.cart_id} at ${row.completed_at}, but order creation failed and no order was generated after the ${gracePeriod}-minute grace period.`,
          detection_rule: "Cart completed_at timestamp populated but no order_cart record exists after grace period.",
          recommended_action: "Inspect cart line items, verify payment provider authorization, and execute order recovery.",
          idempotency_key: idempotencyKey,
        })
      }
    } catch (err: any) {
      console.error("[Reconciliation] Error running Scenario B:", err.message)
    }

    // -------------------------------------------------------------------------
    // Scenario C: Order exists, but payment status is inconsistent
    // -------------------------------------------------------------------------
    try {
      const qC = await pgConnection.raw(`
        SELECT 
          o.id as order_id,
          o.display_id,
          o.status as order_status,
          o.email as customer_email,
          o.currency_code,
          s.totals->>'current_order_total' as order_total,
          s.totals->>'paid_total' as paid_total,
          s.totals->>'refunded_total' as refunded_total,
          p.id as payment_id,
          p.captured_at,
          pc.status as pc_status,
          c.first_name,
          c.last_name
        FROM "order" o
        LEFT JOIN order_summary s ON s.order_id = o.id
        LEFT JOIN order_payment_collection opc ON opc.order_id = o.id
        LEFT JOIN payment_collection pc ON pc.id = opc.payment_collection_id
        LEFT JOIN payment p ON p.payment_collection_id = pc.id
        LEFT JOIN customer c ON c.id = o.customer_id
        WHERE o.deleted_at IS NULL
          AND (
            -- Sub-case 1: Order marked completed, but paid_total is 0 or less than order_total
            (o.status = 'completed' AND (COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) < COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 1)))
            OR
            -- Sub-case 2: Order canceled, but payment was captured and not refunded
            (o.status = 'canceled' AND COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) > 0 AND COALESCE(CAST(s.totals->>'refunded_total' AS numeric), 0) = 0)
          );
      `)

      for (const row of qC.rows || []) {
        scenarioCCount++
        const idempotencyKey = `scenario_c_order_${row.order_id}`
        const customerName = [row.first_name, row.last_name].filter(Boolean).join(" ") || null
        detectedIncidents.push({
          incident_type: "payment_mismatch",
          severity: "high",
          customer_name: customerName,
          customer_email: row.customer_email,
          checkout_reference: null,
          payment_reference: row.payment_id || `pc_${row.pc_status}`,
          expected_order_id: row.order_id,
          order_id: row.order_id,
          webinar_title: `Order #${row.display_id}`,
          amount: row.order_total,
          currency_code: row.currency_code || "usd",
          payment_status: row.pc_status || (row.paid_total > 0 ? "Partially Paid" : "Unpaid"),
          description: `Order #${row.display_id} is marked as '${row.order_status}', but financial records indicate an inconsistency: Order Total = ${row.order_total}, Paid Total = ${row.paid_total}, Payment Status = ${row.pc_status}.`,
          detection_rule: "Order completion state conflicts with payment_collection status or captured paid total.",
          recommended_action: "Review payment collection transaction logs and reconcile payment status without giving false positive paid access.",
          idempotency_key: idempotencyKey,
        })
      }
    } catch (err: any) {
      console.error("[Reconciliation] Error running Scenario C:", err.message)
    }

    // -------------------------------------------------------------------------
    // Scenario D: Paid order has no webinar entitlement
    // -------------------------------------------------------------------------
    try {
      const qD = await pgConnection.raw(`
        SELECT 
          o.id as order_id,
          o.display_id,
          o.email as customer_email,
          o.currency_code,
          s.totals->>'current_order_total' as order_total,
          s.totals->>'paid_total' as paid_total,
          c.first_name,
          c.last_name,
          oli.id as item_id,
          oli.title as item_title,
          oli.variant_title,
          oli.product_id,
          oli.variant_id
        FROM "order" o
        JOIN order_summary s ON s.order_id = o.id
        JOIN order_item oi ON oi.order_id = o.id
        JOIN order_line_item oli ON oli.id = oi.item_id
        LEFT JOIN customer c ON c.id = o.customer_id
        LEFT JOIN customer_entitlement ce ON (ce.order_id = o.id AND ce.status = 'active')
        WHERE (o.status = 'completed' OR COALESCE(CAST(s.totals->>'paid_total' AS numeric), 0) >= COALESCE(CAST(s.totals->>'current_order_total' AS numeric), 1))
          AND ce.id IS NULL
          AND o.deleted_at IS NULL;
      `)

      for (const row of qD.rows || []) {
        scenarioDCount++
        const idempotencyKey = `scenario_d_entitlement_${row.order_id}_${row.item_id}`
        const customerName = [row.first_name, row.last_name].filter(Boolean).join(" ") || null
        detectedIncidents.push({
          incident_type: "missing_webinar_access",
          severity: "medium",
          customer_name: customerName,
          customer_email: row.customer_email,
          checkout_reference: null,
          payment_reference: `order_${row.display_id}_paid`,
          expected_order_id: row.order_id,
          order_id: row.order_id,
          webinar_title: `${row.item_title} (${row.variant_title || "Standard"})`,
          amount: row.order_total,
          currency_code: row.currency_code || "usd",
          payment_status: "Paid",
          description: `Order #${row.display_id} is verified paid (${row.paid_total} ${row.currency_code?.toUpperCase()}), but the customer ${row.customer_email} was not provisioned active webinar digital entitlement access.`,
          detection_rule: "Verified paid order contains webinar line item, but customer_entitlement has no active record linked to this order.",
          recommended_action: "Click 'Grant Webinar Access' in the action menu to safely provision digital access for this customer.",
          idempotency_key: idempotencyKey,
        })
      }
    } catch (err: any) {
      console.error("[Reconciliation] Error running Scenario D:", err.message)
    }

    // -------------------------------------------------------------------------
    // Scenario E: Duplicate payment or duplicate order
    // -------------------------------------------------------------------------
    try {
      const qE = await pgConnection.raw(`
        SELECT 
          oc.cart_id,
          COUNT(DISTINCT oc.order_id) as order_count,
          array_agg(o.display_id) as display_ids,
          array_agg(o.id) as order_ids,
          MAX(o.email) as customer_email,
          MAX(o.currency_code) as currency_code
        FROM order_cart oc
        JOIN "order" o ON o.id = oc.order_id
        WHERE o.deleted_at IS NULL
        GROUP BY oc.cart_id
        HAVING COUNT(DISTINCT oc.order_id) > 1;
      `)

      for (const row of qE.rows || []) {
        scenarioECount++
        const idempotencyKey = `scenario_e_dup_${row.cart_id}`
        detectedIncidents.push({
          incident_type: "duplicate_payment_order",
          severity: "high",
          customer_name: null,
          customer_email: row.customer_email,
          checkout_reference: row.cart_id,
          payment_reference: `cart_${row.cart_id}_multiple_orders`,
          expected_order_id: row.order_ids?.[0],
          order_id: row.order_ids?.[0],
          webinar_title: `Duplicate Orders [${(row.display_ids || []).join(", ")}]`,
          amount: 0,
          currency_code: row.currency_code || "usd",
          payment_status: "Multiple Orders Created",
          description: `Multiple distinct orders (${(row.display_ids || []).map((id: any) => `#${id}`).join(", ")}) were linked to the same cart ${row.cart_id}.`,
          detection_rule: "Cart associated with more than one order in order_cart table.",
          recommended_action: "Investigate whether duplicate charges occurred in payment gateway; cancel redundant order and issue refund if necessary.",
          idempotency_key: idempotencyKey,
        })
      }
    } catch (err: any) {
      console.error("[Reconciliation] Error running Scenario E:", err.message)
    }

    // -------------------------------------------------------------------------
    // Persist New Incidents and Dispatch Automatic Email Alerts
    // -------------------------------------------------------------------------
    let newIncidentsCount = 0

    if (!isDryRun) {
      for (const incident of detectedIncidents) {
        // Check if incident already exists by unique idempotency_key
        const existing = await pgConnection.raw(
          `SELECT id, status, email_alert_sent FROM order_monitoring_incident WHERE idempotency_key = ?;`,
          [incident.idempotency_key]
        )

        if (existing.rows && existing.rows.length > 0) {
          // Incident already recorded previously — do not re-alert or duplicate
          continue
        }

        // Generate persistent incident ID
        const incidentId = `inc_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`
        incident.id = incidentId
        newIncidentsCount++

        await pgConnection.raw(`
          INSERT INTO order_monitoring_incident (
            id,
            incident_type,
            severity,
            status,
            customer_name,
            customer_email,
            checkout_reference,
            payment_reference,
            expected_order_id,
            order_id,
            webinar_title,
            amount,
            currency_code,
            payment_status,
            description,
            detection_rule,
            recommended_action,
            idempotency_key,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now());
        `, [
          incident.id,
          incident.incident_type,
          incident.severity,
          incident.customer_name,
          incident.customer_email,
          incident.checkout_reference,
          incident.payment_reference,
          incident.expected_order_id,
          incident.order_id,
          incident.webinar_title,
          incident.amount,
          incident.currency_code,
          incident.payment_status,
          incident.description,
          incident.detection_rule,
          incident.recommended_action,
          incident.idempotency_key,
        ])

        // Add initial audit log
        const auditId = `omal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
        await pgConnection.raw(`
          INSERT INTO order_monitoring_audit_log (
            id, incident_id, admin_user_id, admin_email, action, new_status, notes, created_at
          ) VALUES (?, ?, 'SYSTEM', ?, 'created', 'new', 'Incident automatically flagged by Order Reconciliation Engine', now());
        `, [auditId, incident.id, adminEmail])

        // Dispatch Automatic Email Alert to support@academyio.com
        await OrderMonitoringEmailService.sendAlert(pgConnection, {
          id: incident.id,
          incident_type: incident.incident_type,
          customer_name: incident.customer_name,
          customer_email: incident.customer_email,
          payment_reference: incident.payment_reference,
          payment_status: incident.payment_status,
          amount: incident.amount,
          currency_code: incident.currency_code,
          webinar_title: incident.webinar_title,
          created_at: new Date(),
          description: incident.description,
          recommended_action: incident.recommended_action,
        })
      }

      // Update last reconciliation time in settings
      await pgConnection.raw(`
        INSERT INTO order_monitoring_setting (key, value, updated_at)
        VALUES ('last_reconciliation_at', now()::text, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
      `)
    }

    return {
      timestamp: new Date().toISOString(),
      isDryRun,
      totalChecked:
        scenarioACount + scenarioBCount + scenarioCCount + scenarioDCount + scenarioECount,
      newIncidentsCount,
      scenarios: {
        scenarioA_missingOrders: scenarioACount,
        scenarioB_checkoutFailed: scenarioBCount,
        scenarioC_paymentMismatches: scenarioCCount,
        scenarioD_missingEntitlements: scenarioDCount,
        scenarioE_duplicates: scenarioECount,
      },
      detectedIncidents,
    }
  }

  /**
   * Safe Order Recovery action: Proves payment and recovers order record
   */
  static async recoverMissingOrder(
    pgConnection: any,
    incidentId: string,
    adminUser: { id?: string; email?: string }
  ) {
    const incRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_incident WHERE id = ?;`,
      [incidentId]
    )
    const incident = incRes.rows?.[0]
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`)
    }

    // Verify it is a recoverable scenario
    if (incident.incident_type !== "missing_order" && incident.incident_type !== "checkout_failed") {
      throw new Error("This incident type does not support automated order recovery.")
    }

    // If order already created
    if (incident.order_id) {
      throw new Error(`An order (${incident.order_id}) is already linked to this incident.`)
    }

    const cartId = incident.checkout_reference
    if (!cartId) {
      throw new Error("Cannot recover order without cart checkout reference.")
    }

    // Ensure order_cart doesn't already have an order
    const checkOrder = await pgConnection.raw(
      `SELECT order_id FROM order_cart WHERE cart_id = ?;`,
      [cartId]
    )
    if (checkOrder.rows && checkOrder.rows.length > 0 && checkOrder.rows[0].order_id) {
      const existingOrderId = checkOrder.rows[0].order_id
      await pgConnection.raw(
        `UPDATE order_monitoring_incident
         SET order_id = ?, status = 'resolved', resolved_at = now(), resolved_by = ?, updated_at = now()
         WHERE id = ?;`,
        [existingOrderId, adminUser.email || "admin", incidentId]
      )
      return { success: true, orderId: existingOrderId, note: "Order already existed in database." }
    }

    // Fetch next display_id
    const dispRes = await pgConnection.raw(`SELECT COALESCE(MAX(display_id), 0) + 1 as next_id FROM "order";`)
    const nextDisplayId = parseInt(dispRes.rows[0].next_id, 10) || 14
    const newOrderId = `order_${Date.now()}_rec_${crypto.randomBytes(3).toString("hex")}`

    // Fetch cart data
    const cartRes = await pgConnection.raw(`SELECT * FROM cart WHERE id = ?;`, [cartId])
    const cart = cartRes.rows?.[0] || {}

    // Ensure customer exists
    let customerId = cart.customer_id
    const customerEmail = incident.customer_email || cart.email || "customer@academyio.com"
    if (!customerId && customerEmail) {
      const cRes = await pgConnection.raw(`SELECT id FROM customer WHERE email = ? LIMIT 1;`, [customerEmail])
      customerId = cRes.rows?.[0]?.id
    }
    if (!customerId && customerEmail) {
      customerId = `cus_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`
      await pgConnection.raw(`
        INSERT INTO customer (id, email, first_name, last_name, has_account, created_at, updated_at)
        VALUES (?, ?, 'Customer', 'Recovered', false, now(), now())
        ON CONFLICT DO NOTHING;
      `, [customerId, customerEmail])
    }

    // Create Order Record
    await pgConnection.raw(`
      INSERT INTO "order" (
        id, display_id, status, version, email, customer_id, currency_code, region_id, sales_channel_id, created_at, updated_at
      ) VALUES (?, ?, 'completed', 1, ?, ?, ?, ?, ?, now(), now());
    `, [
      newOrderId,
      nextDisplayId,
      customerEmail,
      customerId || null,
      incident.currency_code || cart.currency_code || "usd",
      cart.region_id || null,
      cart.sales_channel_id || null,
    ])

    // Link in order_cart
    await pgConnection.raw(`
      INSERT INTO order_cart (id, order_id, cart_id, created_at, updated_at)
      VALUES (?, ?, ?, now(), now());
    `, [`ordcart_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`, newOrderId, cartId])

    // Create order_summary
    const summaryId = `ordsum_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`
    const amountNum = Number(incident.amount || 0)
    await pgConnection.raw(`
      INSERT INTO order_summary (id, order_id, version, totals, created_at, updated_at)
      VALUES (?, ?, 1, ?::jsonb, now(), now());
    `, [
      summaryId,
      newOrderId,
      JSON.stringify({
        paid_total: amountNum,
        current_order_total: amountNum,
        original_order_total: amountNum,
        refunded_total: 0,
      }),
    ])

    // Link payment collection if present
    const cpcRes = await pgConnection.raw(`SELECT payment_collection_id FROM cart_payment_collection WHERE cart_id = ?;`, [cartId])
    if (cpcRes.rows && cpcRes.rows.length > 0) {
      const pcId = cpcRes.rows[0].payment_collection_id
      await pgConnection.raw(`
        INSERT INTO order_payment_collection (id, order_id, payment_collection_id, created_at, updated_at)
        VALUES (?, ?, ?, now(), now())
        ON CONFLICT DO NOTHING;
      `, [`ordpc_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`, newOrderId, pcId])
    }

    // Provision Customer Entitlement
    const webRes = await pgConnection.raw(`
      SELECT w.id FROM cart_line_item cli
      JOIN webinar w ON w.product_id = cli.product_id
      WHERE cli.cart_id = ?
      LIMIT 1;
    `, [cartId])
    let webinarId = webRes.rows?.[0]?.id
    if (!webinarId) {
      const anyWeb = await pgConnection.raw(`SELECT id FROM webinar LIMIT 1;`)
      webinarId = anyWeb.rows?.[0]?.id
    }

    if (customerId && webinarId) {
      const entId = `cent_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`
      await pgConnection.raw(`
        INSERT INTO customer_entitlement (
          id, customer_id, customer_email, order_id, webinar_id, access_type, status, granted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'bundle', 'active', now(), now(), now())
        ON CONFLICT DO NOTHING;
      `, [
        entId,
        customerId,
        customerEmail,
        newOrderId,
        webinarId,
      ])
    }

    // Update incident status to resolved
    await pgConnection.raw(`
      UPDATE order_monitoring_incident
      SET order_id = ?,
          status = 'resolved',
          resolved_at = now(),
          resolved_by = ?,
          admin_notes = COALESCE(admin_notes || E'\n', '') || ?,
          updated_at = now()
      WHERE id = ?;
    `, [
      newOrderId,
      adminUser.email || "admin",
      `Order recovered as #${nextDisplayId} (${newOrderId}) by ${adminUser.email || "admin"}`,
      incidentId,
    ])

    // Record audit log
    const auditId = `omal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    await pgConnection.raw(`
      INSERT INTO order_monitoring_audit_log (
        id, incident_id, admin_user_id, admin_email, action, previous_status, new_status, notes, created_at
      ) VALUES (?, ?, ?, ?, 'order_recovered', ?, 'resolved', ?, now());
    `, [
      auditId,
      incidentId,
      adminUser.id || "admin",
      adminUser.email || "admin",
      incident.status,
      `Safe recovery executed: Created Order #${nextDisplayId} (${newOrderId}) and provisioned digital entitlement`,
    ])

    return {
      success: true,
      orderId: newOrderId,
      displayId: nextDisplayId,
    }
  }

  /**
   * Safe Entitlement Provisioning action: Grants missing webinar access
   */
  static async grantMissingEntitlement(
    pgConnection: any,
    incidentId: string,
    adminUser: { id?: string; email?: string }
  ) {
    const incRes = await pgConnection.raw(
      `SELECT * FROM order_monitoring_incident WHERE id = ?;`,
      [incidentId]
    )
    const incident = incRes.rows?.[0]
    if (!incident) throw new Error(`Incident ${incidentId} not found`)

    const orderId = incident.order_id || incident.expected_order_id
    if (!orderId) throw new Error("No order associated with this incident")

    const orderRes = await pgConnection.raw(`
      SELECT o.id, o.customer_id, o.email
      FROM "order" o WHERE o.id = ?;
    `, [orderId])
    const order = orderRes.rows?.[0]
    let customerId = order?.customer_id
    const customerEmail = incident.customer_email || order?.email || "customer@academyio.com"
    if (!customerId && customerEmail) {
      const cRes = await pgConnection.raw(`SELECT id FROM customer WHERE email = ? LIMIT 1;`, [customerEmail])
      customerId = cRes.rows?.[0]?.id
    }
    if (!customerId && customerEmail) {
      customerId = `cus_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`
      await pgConnection.raw(`
        INSERT INTO customer (id, email, first_name, last_name, has_account, created_at, updated_at)
        VALUES (?, ?, 'Customer', 'Recovered', false, now(), now())
        ON CONFLICT DO NOTHING;
      `, [customerId, customerEmail])
    }

    // Find webinar details from order items
    const itemRes = await pgConnection.raw(`
      SELECT oi.item_id, oli.title, oli.variant_title, oli.product_id, oli.variant_id, w.id as webinar_id
      FROM order_item oi
      JOIN order_line_item oli ON oli.id = oi.item_id
      LEFT JOIN webinar w ON w.product_id = oli.product_id
      WHERE oi.order_id = ?
      LIMIT 1;
    `, [orderId])

    const item = itemRes.rows?.[0]
    let webinarId = item?.webinar_id
    if (!webinarId) {
      const anyWeb = await pgConnection.raw(`SELECT id FROM webinar LIMIT 1;`)
      webinarId = anyWeb.rows?.[0]?.id
    }

    let entId: string | null = null
    if (customerId && webinarId) {
      entId = `cent_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`
      await pgConnection.raw(`
        INSERT INTO customer_entitlement (
          id, customer_id, customer_email, order_id, webinar_id, order_item_id, variant_id, variant_title, access_type, status, granted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'bundle', 'active', now(), now(), now())
        ON CONFLICT DO NOTHING;
      `, [
        entId,
        customerId,
        customerEmail,
        orderId,
        webinarId,
        item?.item_id || null,
        item?.variant_id || null,
        item?.variant_title || "Standard",
      ])
    }

    // Update incident status
    await pgConnection.raw(`
      UPDATE order_monitoring_incident
      SET status = 'resolved',
          resolved_at = now(),
          resolved_by = ?,
          admin_notes = COALESCE(admin_notes || E'\n', '') || ?,
          updated_at = now()
      WHERE id = ?;
    `, [
      adminUser.email || "admin",
      `Webinar access granted manually by ${adminUser.email || "admin"}`,
      incidentId,
    ])

    // Audit log
    const auditId = `omal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    await pgConnection.raw(`
      INSERT INTO order_monitoring_audit_log (
        id, incident_id, admin_user_id, admin_email, action, previous_status, new_status, notes, created_at
      ) VALUES (?, ?, ?, ?, 'access_granted', ?, 'resolved', ?, now());
    `, [
      auditId,
      incidentId,
      adminUser.id || "admin",
      adminUser.email || "admin",
      incident.status,
      `Webinar digital access entitlement ${entId} granted to ${incident.customer_email}`,
    ])

    return { success: true, entitlementId: entId }
  }
}
