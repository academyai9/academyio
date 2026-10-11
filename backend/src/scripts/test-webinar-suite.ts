/**
 * Comprehensive Automated Test Suite for Webinar E-Commerce Platform
 * Tests all core requirements: Data models, API endpoints, Access Control, Entitlements, Bundles, and Security.
 */

const BASE_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`)
    passedTests++
  } else {
    console.error(`  ✖ FAIL: ${message}`)
    failedTests++
  }
}

async function runTestSuite() {
  console.log("\n=======================================================")
  console.log("RUNNING WEBINAR E-COMMERCE PLATFORM AUTOMATED TEST SUITE")
  console.log("=======================================================\n")

  // TEST 1: Public Webinar Listing
  console.log("Test Suite 1: Public Storefront API & Data Discovery")
  try {
    const listRes = await fetch(`${BASE_URL}/store/webinars`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const listData = await listRes.json()
    assert(listRes.status === 200, "Store endpoint /store/webinars returns HTTP 200")
    assert(listData.webinars && listData.webinars.length >= 6, "Returns at least 6 seeded webinars")
    assert(listData.webinars[0].title !== undefined, "Webinar records contain title")
    assert(listData.webinars[0].speaker_name !== undefined, "Webinar records contain speaker details")
    assert(listData.webinars[0].live_stream_url === undefined, "Security: live stream URL is stripped from public listing")
  } catch (err: any) {
    assert(false, `Test Suite 1 failed with error: ${err.message}`)
  }

  // TEST 2: Single Webinar & Variant Mapping
  console.log("\nTest Suite 2: Webinar Details & Purchase Variants")
  let sCorpWebinarId = ""
  try {
    const detailRes = await fetch(`${BASE_URL}/store/webinars/s-corp-basis-analysis-form-7203`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const detailData = await detailRes.json()
    assert(detailRes.status === 200, "Single webinar endpoint returns HTTP 200")
    assert(detailData.webinar.slug === "s-corp-basis-analysis-form-7203", "Returns correct webinar by slug")
    assert(detailData.webinar.variants.length === 5, "Webinar has all 5 purchase variants (Live, Recording, Transcript, PDF, Bundle)")
    sCorpWebinarId = detailData.webinar.id
  } catch (err: any) {
    assert(false, `Test Suite 2 failed with error: ${err.message}`)
  }

  // TEST 3: Customer Authentication
  console.log("\nTest Suite 3: Customer Registration & Secure Authentication")
  let customerToken = ""
  const testEmail = `test_cpa_${Date.now()}@academyio.com`
  try {
    const regRes = await fetch(`${BASE_URL}/auth/customer/emailpass/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "SecurePassword2026!" }),
    })
    const regData = await regRes.json()
    assert(regRes.status === 200 && Boolean(regData.token), "Customer registration succeeds and issues auth token")

    // Link customer in store
    const createCustRes = await fetch(`${BASE_URL}/store/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${regData.token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email: testEmail, first_name: "Test", last_name: "CPA" }),
    })
    assert(createCustRes.status === 200, "Customer profile created successfully")

    // Login
    const loginRes = await fetch(`${BASE_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "SecurePassword2026!" }),
    })
    const loginData = await loginRes.json()
    assert(loginRes.status === 200 && Boolean(loginData.token), "Customer login succeeds and issues JWT")
    customerToken = loginData.token
  } catch (err: any) {
    assert(false, `Test Suite 3 failed with error: ${err.message}`)
  }

  // TEST 4: Security & Access Denial for Non-Entitled User
  console.log("\nTest Suite 4: Access Control & Non-Entitled User Restrictions")
  try {
    const unauthRes = await fetch(`${BASE_URL}/store/customer/webinars/${sCorpWebinarId}/access`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    assert(unauthRes.status === 401, "Unauthenticated access attempt is blocked with HTTP 401 Unauthorized")

    const noEntitlementRes = await fetch(`${BASE_URL}/store/customer/webinars/${sCorpWebinarId}/access`, {
      headers: {
        "Authorization": `Bearer ${customerToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
    assert(
      noEntitlementRes.status === 403,
      "Customer without entitlement is strictly blocked with HTTP 403 Forbidden"
    )
  } catch (err: any) {
    assert(false, `Test Suite 4 failed with error: ${err.message}`)
  }

  // TEST 5: Verified Customer Entitlement & Bundle Access
  console.log("\nTest Suite 5: Verified Entitlement & Bundle Permission Verification")
  try {
    // Login as pre-seeded demo customer who owns the complete package
    const demoLoginRes = await fetch(`${BASE_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@academyio.com", password: "Password123!" }),
    })
    const demoLoginData = await demoLoginRes.json()
    const demoToken = demoLoginData.token
    assert(Boolean(demoToken), "Demo customer login succeeds")

    const entitlementsRes = await fetch(`${BASE_URL}/store/customer/entitlements`, {
      headers: {
        "Authorization": `Bearer ${demoToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
    const entitlementsData = await entitlementsRes.json()
    assert(entitlementsRes.status === 200, "Customer entitlements endpoint returns HTTP 200")
    assert(entitlementsData.purchased_webinars.length >= 2, "Customer has at least 2 purchased webinars in dashboard")

    // Verify S Corp Basis Access (Bundle includes all 4 permissions)
    const sCorpAccessRes = await fetch(`${BASE_URL}/store/customer/webinars/${sCorpWebinarId}/access`, {
      headers: {
        "Authorization": `Bearer ${demoToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
    const sCorpAccessData = await sCorpAccessRes.json()
    assert(sCorpAccessRes.status === 200, "Entitled customer successfully accesses webinar content")
    assert(sCorpAccessData.permissions.can_access_live === true, "Bundle grants Live Webinar access")
    assert(sCorpAccessData.permissions.can_access_recording === true, "Bundle grants Recording access")
    assert(sCorpAccessData.permissions.can_access_transcript === true, "Bundle grants Transcript access")
    assert(sCorpAccessData.permissions.can_access_pdf === true, "Bundle grants PDF resources access")
    assert(Boolean(sCorpAccessData.live?.stream_url), "Live streaming URL is delivered to entitled customer")
    assert(Boolean(sCorpAccessData.recording?.recording_url), "Recording URL is delivered to entitled customer")
    assert(sCorpAccessData.pdf_resources?.resources?.length >= 2, "Downloadable PDF resources delivered")
  } catch (err: any) {
    assert(false, `Test Suite 5 failed with error: ${err.message}`)
  }

  // TEST 6: Granular Entitlements (Recording + PDF only, NO Live, NO Transcript)
  console.log("\nTest Suite 6: Granular Single-Variant Entitlements")
  try {
    const demoLoginRes = await fetch(`${BASE_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@academyio.com", password: "Password123!" }),
    })
    const demoLoginData = await demoLoginRes.json()
    const demoToken = demoLoginData.token

    // GAAP 2026 webinar
    const gaapDetailRes = await fetch(`${BASE_URL}/store/webinars/gaap-accounting-standards-update-2026`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const gaapData = await gaapDetailRes.json()
    const gaapId = gaapData.webinar.id

    const gaapAccessRes = await fetch(`${BASE_URL}/store/customer/webinars/${gaapId}/access`, {
      headers: {
        "Authorization": `Bearer ${demoToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
    const gaapAccessData = await gaapAccessRes.json()
    assert(gaapAccessData.permissions.can_access_live === false, "Customer who bought Recording/PDF does NOT have Live access")
    assert(gaapAccessData.permissions.can_access_transcript === false, "Customer who bought Recording/PDF does NOT have Transcript access")
    assert(gaapAccessData.permissions.can_access_recording === true, "Customer has verified Recording access")
    assert(gaapAccessData.permissions.can_access_pdf === true, "Customer has verified PDF access")
    assert(gaapAccessData.live === undefined, "Live stream object is omitted from payload")
  } catch (err: any) {
    assert(false, `Test Suite 6 failed with error: ${err.message}`)
  }

  console.log("\n=======================================================")
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log("=======================================================\n")

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err)
  process.exit(1)
})
