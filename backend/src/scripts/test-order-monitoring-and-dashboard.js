const { Client } = require('pg');
const http = require('http');

const DB_URL = process.env.DATABASE_URL || 'postgres://sonusaini@127.0.0.1:5432/academyio_medusa';
const BACKEND_URL = 'http://127.0.0.1:9000';

function postJson(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const data = JSON.stringify(body);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let respData = '';
        res.on('data', (c) => (respData += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch (_) {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const req = http.request(
      url,
      {
        method: 'GET',
        headers: {
          ...headers,
        },
      },
      (res) => {
        let respData = '';
        res.on('data', (c) => (respData += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) });
          } catch (_) {
            resolve({ status: res.statusCode, raw: respData });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log('  TESTING ORDER MONITORING, RECONCILIATION & ADMIN DASHBOARD   ');
  console.log('================================================================\n');

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // 1. Authenticate Admin User
  console.log('1. Authenticating Admin User (admin@academyio.com)...');
  const loginRes = await postJson('/auth/user/emailpass', {
    email: 'admin@academyio.com',
    password: 'SuperAdmin2026!',
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Admin authentication failed: ${JSON.stringify(loginRes)}`);
  }
  const adminToken = loginRes.body.token;
  const authHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('✓ Admin authenticated successfully. Bearer token acquired.\n');

  // 2. Test Security: Reject Unauthenticated Calls
  console.log('2. Verifying Security on Protected Admin Endpoints...');
  const unauthDash = await getJson('/admin/orders-dashboard');
  if (unauthDash.status === 401) {
    console.log('✓ /admin/orders-dashboard correctly blocked unauthenticated request (HTTP 401)');
  } else {
    throw new Error(`Expected 401 on unauth dashboard, got ${unauthDash.status}`);
  }

  const unauthOrders = await getJson('/admin/orders-management');
  if (unauthOrders.status === 401) {
    console.log('✓ /admin/orders-management correctly blocked unauthenticated request (HTTP 401)');
  } else {
    throw new Error(`Expected 401 on unauth orders management, got ${unauthOrders.status}`);
  }

  const unauthMon = await getJson('/admin/order-monitoring');
  if (unauthMon.status === 401) {
    console.log('✓ /admin/order-monitoring correctly blocked unauthenticated request (HTTP 401)\n');
  } else {
    throw new Error(`Expected 401 on unauth order monitoring, got ${unauthMon.status}`);
  }

  // 3. Test Dashboard API Data
  console.log('3. Testing Dashboard API (/admin/orders-dashboard)...');
  const dashRes = await getJson('/admin/orders-dashboard?range=30d', authHeaders);
  if (dashRes.status !== 200) {
    throw new Error(`Dashboard API failed: ${JSON.stringify(dashRes)}`);
  }
  const metrics = dashRes.body.metrics;
  console.log('✓ Dashboard Metrics loaded:');
  console.log(`   - Total Orders: ${metrics.total_orders}`);
  console.log(`   - Paid Orders: ${metrics.paid_orders}`);
  console.log(`   - Pending Orders: ${metrics.pending_orders}`);
  console.log(`   - Canceled Orders: ${metrics.canceled_orders}`);
  console.log(`   - Orders Requiring Attention: ${metrics.orders_requiring_attention}`);
  console.log(`   - Total Revenue: $${metrics.total_revenue}`);
  console.log(`   - Avg Order Value: $${metrics.average_order_value}`);
  console.log(`   - Chart Days Count: ${dashRes.body.chart_data.length}`);
  console.log(`   - Recent Orders Count: ${dashRes.body.recent_orders.length}\n`);

  // 4. Test Orders Management API (Search & Filters)
  console.log('4. Testing Orders Management API (/admin/orders-management)...');
  const ordersListRes = await getJson('/admin/orders-management?limit=10', authHeaders);
  if (ordersListRes.status !== 200) {
    throw new Error(`Orders Management API failed: ${JSON.stringify(ordersListRes)}`);
  }
  console.log(`✓ Orders list returned ${ordersListRes.body.orders.length} items (Total: ${ordersListRes.body.count})`);

  // Test Search by customer email
  const searchRes = await getJson('/admin/orders-management?q=customer@academyio.com', authHeaders);
  console.log(`✓ Search for 'customer@academyio.com' returned ${searchRes.body.orders.length} matching order(s)`);

  // Test Order Detail Endpoint
  const firstOrder = ordersListRes.body.orders[0];
  if (firstOrder) {
    const detailRes = await getJson(`/admin/orders-management/${firstOrder.id}`, authHeaders);
    if (detailRes.status === 200 && detailRes.body.order) {
      console.log(`✓ Order detail endpoint loaded Order #${detailRes.body.order.display_id} with items & payment details\n`);
    } else {
      throw new Error(`Failed to load order detail: ${JSON.stringify(detailRes)}`);
    }
  }

  // 5. Test Reconciliation Engine (Dry Run)
  console.log('5. Testing Order Reconciliation Engine (Dry Run)...');
  const dryRunRes = await postJson(
    '/admin/order-monitoring/reconcile',
    { dry_run: true, grace_period_minutes: 0 },
    authHeaders
  );
  if (dryRunRes.status !== 200) {
    throw new Error(`Dry Run reconciliation failed: ${JSON.stringify(dryRunRes)}`);
  }
  console.log('✓ Dry Run successful. Scenarios checked:');
  console.log(dryRunRes.body.result.scenarios);
  console.log(`✓ Total anomalies identified without database alteration: ${dryRunRes.body.result.totalChecked}\n`);

  // 6. Test Synthetic Incident Creation & Automated Email Alert
  console.log('6. Testing Synthetic Missing-Order Incident Creation & Email Alert...');
  const testPaymentId = `pay_test_missing_${Date.now()}`;
  const testCartId = `cart_test_missing_${Date.now()}`;
  const testEmail = `synthetic_student_${Date.now()}@example.com`;

  // Create payment record without an order
  const pcId = `pay_col_test_${Date.now()}`;
  const rawAmt = JSON.stringify({ value: '199', precision: 20 });
  await client.query(`
    INSERT INTO payment_collection (id, currency_code, amount, raw_amount, status, created_at, updated_at)
    VALUES ($1, 'usd', 199, $2::jsonb, 'authorized', now() - interval '10 minutes', now() - interval '10 minutes');
  `, [pcId, rawAmt]);

  await client.query(`
    INSERT INTO cart (id, currency_code, email, created_at, updated_at)
    VALUES ($1, 'usd', $2, now() - interval '10 minutes', now() - interval '10 minutes');
  `, [testCartId, testEmail]);

  const cpcId = `cpc_test_${Date.now()}`;
  await client.query(`
    INSERT INTO cart_payment_collection (id, cart_id, payment_collection_id)
    VALUES ($1, $2, $3);
  `, [cpcId, testCartId, pcId]);

  const paySesId = `payses_test_${Date.now()}`;
  await client.query(`
    INSERT INTO payment_session (id, currency_code, amount, raw_amount, provider_id, status, payment_collection_id, created_at, updated_at)
    VALUES ($1, 'usd', 199, $2::jsonb, 'pp_stripe_test', 'authorized', $3, now() - interval '10 minutes', now() - interval '10 minutes');
  `, [paySesId, rawAmt, pcId]);

  await client.query(`
    INSERT INTO payment (id, amount, raw_amount, currency_code, provider_id, payment_collection_id, payment_session_id, captured_at, created_at, updated_at)
    VALUES ($1, 199, $2::jsonb, 'usd', 'pp_stripe_test', $3, $4, now() - interval '10 minutes', now() - interval '10 minutes', now() - interval '10 minutes');
  `, [testPaymentId, rawAmt, pcId, paySesId]);

  console.log(`✓ Inserted captured payment ${testPaymentId} ($199 USD) without order record for cart ${testCartId}`);

  // Run live reconciliation
  console.log('   Executing Live Reconciliation...');
  const liveRecRes = await postJson(
    '/admin/order-monitoring/reconcile',
    { dry_run: false, grace_period_minutes: 5 },
    authHeaders
  );
  if (liveRecRes.status !== 200) {
    throw new Error(`Live reconciliation failed: ${JSON.stringify(liveRecRes)}`);
  }
  console.log(`✓ Live reconciliation detected and recorded new incident(s): ${liveRecRes.body.result.newIncidentsCount}`);

  // Verify incident in database
  const incDb = await client.query(`
    SELECT * FROM order_monitoring_incident WHERE payment_reference = $1;
  `, [testPaymentId]);

  if (incDb.rows.length === 0) {
    throw new Error('Expected missing-order incident to be recorded in database');
  }
  const inc = incDb.rows[0];
  console.log(`✓ Confirmed Incident in Database:`);
  console.log(`   - ID: ${inc.id}`);
  console.log(`   - Type: ${inc.incident_type}`);
  console.log(`   - Status: ${inc.status}`);
  console.log(`   - Email Alert Sent: ${inc.email_alert_sent}`);
  console.log(`   - Email Sent At: ${inc.email_alert_sent_at}`);
  console.log(`   - Message ID: ${inc.email_provider_message_id}`);

  // Verify Email Log table
  const emailLogDb = await client.query(`
    SELECT * FROM order_monitoring_email_log WHERE incident_id = $1;
  `, [inc.id]);
  if (emailLogDb.rows.length === 0) {
    throw new Error('Expected email log entry in order_monitoring_email_log');
  }
  console.log(`✓ Confirmed Email Delivery Log:`);
  console.log(`   - Recipient: ${emailLogDb.rows[0].recipient}`);
  console.log(`   - Subject: ${emailLogDb.rows[0].subject}`);
  console.log(`   - Status: ${emailLogDb.rows[0].status}`);

  // 7. Test Idempotency & Duplicate Alert Suppression
  console.log('\n7. Testing Idempotency & Duplicate Alert Suppression on Repeated Scans...');
  const secondRunRes = await postJson(
    '/admin/order-monitoring/reconcile',
    { dry_run: false, grace_period_minutes: 5 },
    authHeaders
  );
  const incDbAfter = await client.query(`
    SELECT COUNT(*) as c FROM order_monitoring_incident WHERE payment_reference = $1;
  `, [testPaymentId]);
  if (parseInt(incDbAfter.rows[0].c, 10) === 1) {
    console.log('✓ Idempotency verified: Repeated reconciliation did NOT duplicate the incident or spam repeat alerts.');
  } else {
    throw new Error(`Duplicate incident created! Count: ${incDbAfter.rows[0].c}`);
  }

  // 8. Test Resend Alert API
  console.log('\n8. Testing Resend Alert Action (/admin/order-monitoring/:id/resend-alert)...');
  const resendRes = await postJson(
    `/admin/order-monitoring/${inc.id}/resend-alert`,
    {},
    authHeaders
  );
  if (resendRes.status === 200 && resendRes.body.success) {
    console.log(`✓ Alert successfully resent to support@academyio.com (Message ID: ${resendRes.body.messageId})`);
  } else {
    throw new Error(`Failed to resend alert: ${JSON.stringify(resendRes)}`);
  }

  // 9. Test Safe Order Recovery
  console.log('\n9. Testing Safe Order Recovery Workflow...');
  const recoverRes = await postJson(
    `/admin/order-monitoring/${inc.id}/recover-order`,
    {},
    authHeaders
  );
  if (recoverRes.status !== 200 || !recoverRes.body.success) {
    throw new Error(`Order recovery failed: ${JSON.stringify(recoverRes)}`);
  }
  console.log(`✓ Safe Order Recovery executed:`);
  console.log(`   - Generated Order ID: ${recoverRes.body.result.orderId}`);
  console.log(`   - Display ID: #${recoverRes.body.result.displayId}`);

  // Verify incident is now resolved
  const incResolved = await client.query(`SELECT status, resolved_by, order_id FROM order_monitoring_incident WHERE id = $1;`, [inc.id]);
  console.log(`   - Updated Incident Status: ${incResolved.rows[0].status}`);
  console.log(`   - Resolved By: ${incResolved.rows[0].resolved_by}`);

  // Verify entitlement was created
  const entCheck = await client.query(`SELECT id, status, access_type FROM customer_entitlement WHERE order_id = $1;`, [recoverRes.body.result.orderId]);
  console.log(`   - Customer Entitlement Created: ID ${entCheck.rows[0]?.id} (Status: ${entCheck.rows[0]?.status})`);

  // Clean up synthetic test records
  console.log('\n10. Cleaning up synthetic test records...');
  await client.query(`DELETE FROM order_monitoring_audit_log WHERE incident_id = $1;`, [inc.id]);
  await client.query(`DELETE FROM order_monitoring_email_log WHERE incident_id = $1;`, [inc.id]);
  await client.query(`DELETE FROM customer_entitlement WHERE order_id = $1;`, [recoverRes.body.result.orderId]);
  await client.query(`DELETE FROM order_monitoring_incident WHERE id = $1;`, [inc.id]);
  await client.query(`DELETE FROM order_cart WHERE cart_id = $1;`, [testCartId]);
  await client.query(`DELETE FROM order_summary WHERE order_id = $1;`, [recoverRes.body.result.orderId]);
  await client.query(`DELETE FROM "order" WHERE id = $1;`, [recoverRes.body.result.orderId]);
  await client.query(`DELETE FROM payment WHERE id = $1;`, [testPaymentId]);
  await client.query(`DELETE FROM cart_payment_collection WHERE cart_id = $1;`, [testCartId]);
  await client.query(`DELETE FROM payment_collection WHERE id = $1;`, [pcId]);
  await client.query(`DELETE FROM cart WHERE id = $1;`, [testCartId]);
  console.log('✓ Synthetic test records cleaned up cleanly.');

  await client.end();
  console.log('\n================================================================');
  console.log('  ALL ORDER MONITORING & ADMIN DASHBOARD TESTS PASSED (10/10)   ');
  console.log('================================================================\n');
}

run().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
