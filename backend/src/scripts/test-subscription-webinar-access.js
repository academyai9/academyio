const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://sonusaini@127.0.0.1:5432/academyio_medusa',
});

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:9000${path}`);
    const reqHeaders = {
      'Content-Type': 'application/json',
      'x-publishable-api-key': 'pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978',
      ...headers,
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (_) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 ACADEMYIO SUBSCRIPTION WEBINAR ACCESS E2E TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Get an existing customer or create a test customer
    const testEmail = `sub_test_${Date.now()}@academyio.com`;
    const custRes = await pool.query(
      `INSERT INTO customer (id, email, first_name, last_name, has_account)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email;`,
      [`cus_test_${Date.now()}`, testEmail, 'SubTester', 'AcademyIO']
    );
    const testCustomer = custRes.rows[0];
    assert(testCustomer && testCustomer.id, 'Test Customer Provisioned in Database');

    // 2. Fetch an active webinar
    const webRes = await pool.query(`SELECT id, title, slug FROM webinar LIMIT 2;`);
    const testWebinar1 = webRes.rows[0];
    const testWebinar2 = webRes.rows[1] || webRes.rows[0];
    assert(testWebinar1 && testWebinar1.id, `Test Webinar 1 Found: "${testWebinar1.title}" (${testWebinar1.id})`);

    // 3. Test GET subscription status for non-subscriber
    const nonSubStatus = await request(
      'GET',
      `/store/customer/webinars/${testWebinar1.id}/subscription-register?customer_email=${encodeURIComponent(testEmail)}`
    );
    assert(
      nonSubStatus.status === 200 &&
      nonSubStatus.data.has_active_subscription === false &&
      nonSubStatus.data.can_register_free === false &&
      nonSubStatus.data.is_registered === false,
      'Non-subscriber correctly denied free registration via GET endpoint'
    );

    // 4. Test POST subscription registration for non-subscriber (should fail with 403)
    const nonSubPost = await request(
      'POST',
      `/store/customer/webinars/${testWebinar1.id}/subscription-register`,
      { customer_email: testEmail }
    );
    assert(
      nonSubPost.status === 403 && nonSubPost.data.error === 'NO_ACTIVE_SUBSCRIPTION',
      'Non-subscriber registration blocked with 403 NO_ACTIVE_SUBSCRIPTION'
    );

    // 5. Create an active subscription for test customer
    const plansRes = await pool.query(`SELECT id, name, webinar_access_limit FROM subscription_plan WHERE status = 'active' LIMIT 1;`);
    const testPlan = plansRes.rows[0];
    assert(testPlan && testPlan.id, `Active Plan Retrieved: "${testPlan.name}" (${testPlan.id})`);

    const subId = `sub_test_${Date.now()}`;
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO customer_subscription (
        id, customer_id, customer_email, plan_id, plan_name, status,
        current_period_start, current_period_end, cancel_at_period_end,
        monthly_access_used, payment_provider_id, payment_method_summary
      ) VALUES ($1, $2, $3, $4, $5, 'active', NOW(), $6, false, 0, 'stripe', 'Visa ending in 4242');`,
      [subId, testCustomer.id, testCustomer.email, testPlan.id, testPlan.name, nextMonth]
    );

    // 6. Test GET subscription status for subscriber
    const subStatus1 = await request(
      'GET',
      `/store/customer/webinars/${testWebinar1.id}/subscription-register?customer_email=${encodeURIComponent(testEmail)}`
    );
    assert(
      subStatus1.status === 200 &&
      subStatus1.data.has_active_subscription === true &&
      subStatus1.data.can_register_free === true &&
      subStatus1.data.is_registered === false,
      'Active subscriber recognized: can_register_free = true, is_registered = false'
    );

    // 7. Test POST registration with subscription (free unlock)
    const registerRes = await request(
      'POST',
      `/store/customer/webinars/${testWebinar1.id}/subscription-register`,
      { customer_email: testEmail }
    );
    assert(
      (registerRes.status === 200 || registerRes.status === 201) &&
      registerRes.data.success === true &&
      registerRes.data.entitlement,
      'Webinar registered at zero cost with active subscription'
    );

    // 8. Verify entitlement in database has order_id: SUB_... and source: subscription
    const entRes = await pool.query(
      `SELECT id, customer_id, webinar_id, order_id, access_type, status, metadata
       FROM customer_entitlement
       WHERE customer_id = $1 AND webinar_id = $2;`,
      [testCustomer.id, testCustomer.id ? testWebinar1.id : '']
    );
    const entitlement = entRes.rows[0];
    assert(
      entitlement &&
      entitlement.order_id === `SUB_${subId}` &&
      entitlement.metadata?.source === 'subscription' &&
      entitlement.status === 'active',
      `CustomerEntitlement created with order_id="SUB_${subId}" and source="subscription"`
    );

    // 9. Verify monthly_access_used incremented
    const subUsageRes = await pool.query(`SELECT monthly_access_used FROM customer_subscription WHERE id = $1;`, [subId]);
    assert(
      subUsageRes.rows[0]?.monthly_access_used === 1,
      `Monthly access usage incremented: ${subUsageRes.rows[0]?.monthly_access_used} used`
    );

    // 10. Test GET subscription status after registration
    const subStatus2 = await request(
      'GET',
      `/store/customer/webinars/${testWebinar1.id}/subscription-register?customer_email=${encodeURIComponent(testEmail)}`
    );
    assert(
      subStatus2.status === 200 &&
      subStatus2.data.is_registered === true &&
      subStatus2.data.entitlement_source === 'subscription' &&
      subStatus2.data.materials !== null,
      'GET endpoint returns is_registered=true, entitlement_source="subscription", and secured materials'
    );

    // 11. Test separate direct purchase entitlement independence
    const directEntId = `ent_dir_${Date.now()}`;
    await pool.query(
      `INSERT INTO customer_entitlement (
        id, customer_id, customer_email, webinar_id, order_id, access_type, status, granted_at, metadata
      ) VALUES ($1, $2, $3, $4, 'order_test_direct_123', 'bundle', 'active', NOW(), '{"source": "order"}');`,
      [directEntId, testCustomer.id, testCustomer.email, testWebinar2.id]
    );

    const directStatus = await request(
      'GET',
      `/store/customer/webinars/${testWebinar2.id}/subscription-register?customer_email=${encodeURIComponent(testEmail)}`
    );
    assert(
      directStatus.status === 200 &&
      directStatus.data.is_registered === true &&
      directStatus.data.entitlement_source === 'direct_purchase',
      'Direct order entitlement correctly identified as entitlement_source="direct_purchase"'
    );

    // 12. Simulate Subscription Cancellation / Expiration
    await pool.query(
      `UPDATE customer_subscription
       SET status = 'expired', current_period_end = NOW() - INTERVAL '1 day'
       WHERE id = $1;`,
      [subId]
    );

    // Direct purchase webinar must REMAIN ACTIVE even after subscription expires
    const directAfterExp = await request(
      'GET',
      `/store/customer/webinars/${testWebinar2.id}/subscription-register?customer_email=${encodeURIComponent(testEmail)}`
    );
    assert(
      directAfterExp.status === 200 &&
      directAfterExp.data.has_active_subscription === false &&
      directAfterExp.data.is_registered === true &&
      directAfterExp.data.entitlement_source === 'direct_purchase',
      'Separately purchased individual webinar REMAINS ACCESSIBLE after subscription expires'
    );

    // Clean up test data
    await pool.query(`DELETE FROM customer_entitlement WHERE customer_id = $1;`, [testCustomer.id]);
    await pool.query(`DELETE FROM customer_subscription WHERE customer_id = $1;`, [testCustomer.id]);
    await pool.query(`DELETE FROM customer WHERE id = $1;`, [testCustomer.id]);
    console.log('\n🧹 Test customer and subscription data cleaned up.');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
