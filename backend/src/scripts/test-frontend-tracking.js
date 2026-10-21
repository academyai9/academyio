/**
 * Automated Verification Script for Frontend Tracking Codes & Security Isolation
 */
const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== ACADEMYIO FRONTEND TRACKING & ISOLATION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Admin Authentication
    console.log('\n--- 1. Testing Admin Authentication ---');
    const loginRes = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/auth/user/emailpass',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: 'admin@academyio.com',
      password: 'SuperAdmin2026!'
    });

    assert(loginRes.statusCode === 200 && loginRes.body.token, 'Admin authentication successful');
    const adminToken = loginRes.body?.token;
    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // 2. Publishable Key Verification for Store API
    console.log('\n--- 2. Fetching Publishable Key for Store API ---');
    const keyRes = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/admin/api-keys',
      method: 'GET',
      headers: adminHeaders
    });
    
    let publishableKey = '';
    if (keyRes.body?.api_keys) {
      const pubKey = keyRes.body.api_keys.find(k => k.type === 'publishable');
      if (pubKey) publishableKey = pubKey.token;
    }
    assert(publishableKey.length > 0, `Publishable API key retrieved: ${publishableKey.substring(0, 15)}...`);

    // 3. Validation Testing Endpoint (POST /admin/tracking-codes/test-validation)
    console.log('\n--- 3. Testing Validation Endpoint ---');
    
    // 3a: Valid GA4 format
    const validGa4 = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/admin/tracking-codes/test-validation',
      method: 'POST',
      headers: adminHeaders
    }, {
      name: 'GA4 Test',
      type: 'ga4',
      tracking_id: 'G-TEST123456',
      placement: 'head',
      target_pages: 'all'
    });
    assert(validGa4.body?.valid === true, 'Accepts valid GA4 format (G-TEST123456)');

    // 3b: Invalid GA4 format
    const invalidGa4 = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/admin/tracking-codes/test-validation',
      method: 'POST',
      headers: adminHeaders
    }, {
      name: 'GA4 Test',
      type: 'ga4',
      tracking_id: 'INVALID_GA_ID',
      placement: 'head',
      target_pages: 'all'
    });
    assert(invalidGa4.body?.valid === false, 'Rejects invalid GA4 format');

    // 3c: Dangerous custom script (Security check)
    const dangerousScript = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/admin/tracking-codes/test-validation',
      method: 'POST',
      headers: adminHeaders
    }, {
      name: 'Dangerous Script Test',
      type: 'custom',
      custom_code: '<script>var token = localStorage.getItem("medusa_auth_token"); document.cookie = "stolen=true";</script>',
      placement: 'body_end',
      target_pages: 'all'
    });
    assert(dangerousScript.body?.valid === false && dangerousScript.body?.error?.includes('forbidden references'), 'Blocks dangerous custom code accessing tokens or credentials');

    // 4. Create Tracking Codes (CRUD)
    console.log('\n--- 4. Testing Tracking Codes CRUD Operations ---');
    
    // Create GTM code
    const createGtm = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/admin/tracking-codes',
      method: 'POST',
      headers: adminHeaders
    }, {
      name: 'Google Tag Manager Main',
      type: 'gtm',
      tracking_id: 'GTM-TEST001',
      placement: 'head',
      target_pages: 'all',
      is_enabled: true,
      description: 'Main GTM container for storefront analytics'
    });
    assert(createGtm.statusCode === 201 && createGtm.body?.tracking_code?.id, 'Created GTM tracking code');
    const gtmId = createGtm.body?.tracking_code?.id;

    // Create Disabled Meta Pixel code
    const createPixel = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/admin/tracking-codes',
      method: 'POST',
      headers: adminHeaders
    }, {
      name: 'Meta Pixel Inactive Test',
      type: 'meta_pixel',
      tracking_id: '123456789012345',
      placement: 'head',
      target_pages: 'checkout',
      is_enabled: false,
      description: 'Disabled pixel test'
    });
    assert(createPixel.statusCode === 201 && createPixel.body?.tracking_code?.is_enabled === false, 'Created disabled Meta Pixel tracking code');
    const pixelId = createPixel.body?.tracking_code?.id;

    // 5. Toggle State & Audit Log
    console.log('\n--- 5. Testing Toggle Status & Audit Logs ---');
    const toggleRes = await request({
      hostname: 'localhost',
      port: 9000,
      path: `/admin/tracking-codes/${pixelId}/toggle`,
      method: 'POST',
      headers: adminHeaders
    }, { is_enabled: true });
    assert(toggleRes.statusCode === 200 && toggleRes.body?.tracking_code?.is_enabled === true, 'Toggled pixel status from false to true');

    // Verify Audit Log via GET /admin/tracking-codes/[id]
    const getDetail = await request({
      hostname: 'localhost',
      port: 9000,
      path: `/admin/tracking-codes/${pixelId}`,
      method: 'GET',
      headers: adminHeaders
    });
    assert(getDetail.statusCode === 200 && getDetail.body?.audit_logs?.length >= 2, 'Audit logs properly tracked create and toggle operations');

    // 6. Storefront API Boundary & Leak Prevention
    console.log('\n--- 6. Testing Storefront Public API Boundary ---');
    
    // Toggle pixel back to false to verify disabled codes are never exposed to storefront
    await request({
      hostname: 'localhost',
      port: 9000,
      path: `/admin/tracking-codes/${pixelId}/toggle`,
      method: 'POST',
      headers: adminHeaders
    }, { is_enabled: false });

    const storeRes = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/store/tracking-codes',
      method: 'GET',
      headers: {
        'x-publishable-api-key': publishableKey
      }
    });

    assert(storeRes.statusCode === 200 && Array.isArray(storeRes.body?.tracking_codes), 'Storefront API returned 200 OK');
    const returnedCodes = storeRes.body?.tracking_codes || [];
    
    // Assert all returned codes are is_enabled === true
    const allEnabled = returnedCodes.every(c => c.is_enabled === true);
    assert(allEnabled, 'Storefront API strictly returns ONLY enabled tracking codes');

    // Assert disabled pixel is NOT in storefront response
    const containsDisabled = returnedCodes.some(c => c.id === pixelId);
    assert(!containsDisabled, 'Disabled tracking codes are NOT exposed to the storefront');

    // Assert sensitive admin fields (created_by, last_updated_by, audit_logs) are excluded
    const hasAdminFields = returnedCodes.some(c => c.created_by !== undefined || c.audit_logs !== undefined);
    assert(!hasAdminFields, 'Internal admin metadata (created_by, audit_logs) is completely redacted from Storefront response');

    // 7. Security Isolation: Admin Dashboard Route Cleanliness
    console.log('\n--- 7. Testing Admin Dashboard Isolation (Critical Requirement) ---');
    
    // Check Medusa Admin App Shell
    const adminAppRes = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/webapp',
      method: 'GET'
    });
    const adminAppHtml = typeof adminAppRes.body === 'string' ? adminAppRes.body : JSON.stringify(adminAppRes.body);
    
    const containsGTMInAdmin = adminAppHtml.includes('googletagmanager.com') || adminAppHtml.includes('GTM-TEST001');
    const containsGAInAdmin = adminAppHtml.includes('googletagmanager.com/gtag/js') || adminAppHtml.includes('G-ACADEMYIO99');
    const containsMetaInAdmin = adminAppHtml.includes('connect.facebook.net') || adminAppHtml.includes('fbq(');

    assert(!containsGTMInAdmin, 'Admin Dashboard HTML does NOT contain Google Tag Manager scripts');
    assert(!containsGAInAdmin, 'Admin Dashboard HTML does NOT contain Google Analytics scripts');
    assert(!containsMetaInAdmin, 'Admin Dashboard HTML does NOT contain Meta Pixel scripts');

    // Check Medusa Admin Login Page
    const adminLoginRes = await request({
      hostname: 'localhost',
      port: 9000,
      path: '/webapp/login',
      method: 'GET'
    });
    const adminLoginHtml = typeof adminLoginRes.body === 'string' ? adminLoginRes.body : JSON.stringify(adminLoginRes.body);
    const containsTrackingInLogin = adminLoginHtml.includes('googletagmanager') || adminLoginHtml.includes('connect.facebook.net');
    assert(!containsTrackingInLogin, 'Admin Login Page does NOT contain any frontend tracking scripts');

    // 8. Storefront Execution Check
    console.log('\n--- 8. Testing Storefront Execution ---');
    const storefrontRes = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/us',
      method: 'GET'
    });
    assert(storefrontRes.statusCode === 200, 'Storefront /us loaded successfully (HTTP 200)');
    const storefrontHtml = typeof storefrontRes.body === 'string' ? storefrontRes.body : JSON.stringify(storefrontRes.body);
    const hasGscVerification = storefrontHtml.includes('google-site-verification') || storefrontHtml.includes('google-site-verification-academyio-2026');
    assert(hasGscVerification, 'Storefront renders Google Site Verification meta tag');

    // 8b. Checkout Route Execution Check
    const checkoutRes = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/us/checkout',
      method: 'GET'
    });
    assert(checkoutRes.statusCode === 200 || checkoutRes.statusCode === 307, `Storefront /us/checkout returned expected HTTP status (${checkoutRes.statusCode})`);
    
    // 8c. Webinar Listing Execution Check
    const webinarsRes = await request({
      hostname: 'localhost',
      port: 8000,
      path: '/us/webinars',
      method: 'GET'
    });
    assert(webinarsRes.statusCode === 200, 'Storefront /us/webinars loaded successfully (HTTP 200)');
    const webinarsHtml = typeof webinarsRes.body === 'string' ? webinarsRes.body : JSON.stringify(webinarsRes.body);
    const webinarsHasGsc = webinarsHtml.includes('google-site-verification') || webinarsHtml.includes('google-site-verification-academyio-2026');
    assert(webinarsHasGsc, 'Storefront /us/webinars renders tracking loader tags');

    // 9. Cleanup test records
    console.log('\n--- 9. Cleaning Up Test Tracking Codes ---');
    if (gtmId) {
      await request({
        hostname: 'localhost',
        port: 9000,
        path: `/admin/tracking-codes/${gtmId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
    }
    if (pixelId) {
      await request({
        hostname: 'localhost',
        port: 9000,
        path: `/admin/tracking-codes/${pixelId}`,
        method: 'DELETE',
        headers: adminHeaders
      });
    }
    console.log('Cleaned up test tracking codes.');

    console.log(`\n========================================`);
    console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
