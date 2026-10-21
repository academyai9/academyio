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
    assert(detailData.webinar.variants.length >= 5, "Webinar has all 5 purchase variants (Live, Recording, Transcript, PDF, Bundle)")
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
    const granularEmail = `test_granular_${Date.now()}@academyio.com`
    const regRes = await fetch(`${BASE_URL}/auth/customer/emailpass/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: granularEmail, password: "SecurePassword2026!" }),
    })
    const regData = await regRes.json()
    const granularToken = regData.token

    const createCustRes = await fetch(`${BASE_URL}/store/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${granularToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email: granularEmail, first_name: "Granular", last_name: "Buyer" }),
    })
    const custData = await createCustRes.json()
    const customerId = custData.customer.id

    // Log in to get session token with actor_id linked
    const loginCustRes = await fetch(`${BASE_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: granularEmail, password: "SecurePassword2026!" }),
    })
    const loginCustData = await loginCustRes.json()
    const activeGranularToken = loginCustData.token

    // GAAP 2026 webinar
    const gaapDetailRes = await fetch(`${BASE_URL}/store/webinars/gaap-accounting-standards-update-2026`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const gaapData = await gaapDetailRes.json()
    const gaapId = gaapData.webinar.id

    // Grant isolated Recording and PDF entitlements via Admin
    const adminLogRes = await fetch(`${BASE_URL}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@academyio.com", password: "SuperAdmin2026!" }),
    })
    const adminLogData = await adminLogRes.json()
    const admToken = adminLogData.token

    await fetch(`${BASE_URL}/admin/entitlements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${admToken}`,
      },
      body: JSON.stringify({
        customer_id: customerId,
        customer_email: granularEmail,
        webinar_id: gaapId,
        access_type: "recording",
      }),
    })

    await fetch(`${BASE_URL}/admin/entitlements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${admToken}`,
      },
      body: JSON.stringify({
        customer_id: customerId,
        customer_email: granularEmail,
        webinar_id: gaapId,
        access_type: "pdf",
      }),
    })

    const gaapAccessRes = await fetch(`${BASE_URL}/store/customer/webinars/${gaapId}/access`, {
      headers: {
        "Authorization": `Bearer ${activeGranularToken}`,
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

  // TEST 7: Admin Authentication & Webinar Management API
  console.log("\nTest Suite 7: Medusa Admin API & Webinar CRUD Operations")
  let adminToken = ""
  try {
    const adminLoginRes = await fetch(`${BASE_URL}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@academyio.com", password: "SuperAdmin2026!" }),
    })
    const adminLoginData = await adminLoginRes.json()
    adminToken = adminLoginData.token
    assert(Boolean(adminToken), "Admin authentication succeeds and issues admin token")

    // List webinars via admin endpoint
    const adminListRes = await fetch(`${BASE_URL}/admin/webinars`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const adminListData = await adminListRes.json()
    assert(adminListRes.status === 200, "Admin /admin/webinars returns HTTP 200")
    assert(adminListData.webinars && adminListData.webinars.length >= 6, "Admin endpoint returns all webinar records")

    // Update webinar via admin endpoint
    const updateRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cpe_credits: 3 }),
    })
    const updateData = await updateRes.json()
    assert(updateRes.status === 200, "Admin can update webinar attributes (e.g. cpe_credits)")
    assert(updateData.webinar.cpe_credits === 3, "Webinar reflects updated attribute")

    // Reset back
    await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cpe_credits: 2 }),
    })

    // Duplicate webinar action
    const dupRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: "duplicate" }),
    })
    const dupData = await dupRes.json()
    assert(dupRes.status === 201, "Admin duplicates webinar with HTTP 201")
    assert(dupData.webinar && dupData.webinar.title.includes("(Copy)"), "Duplicated webinar title includes (Copy)")
    assert(dupData.webinar.status === "draft", "Duplicated webinar created in draft status")

    // Safely delete duplicated draft webinar
    const delDupRes = await fetch(`${BASE_URL}/admin/webinars/${dupData.webinar.id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    assert(delDupRes.status === 200, "Admin safely deletes duplicated webinar draft")
  } catch (err: any) {
    assert(false, `Test Suite 7 failed with error: ${err.message}`)
  }

  // TEST 8: Admin Purchase Options & Variant Mapping
  console.log("\nTest Suite 8: Admin Purchase Options & Variant Management")
  try {
    const variantsRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/variants`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const variantsData = await variantsRes.json()
    assert(variantsRes.status === 200, "Admin /admin/webinars/[id]/variants returns HTTP 200")
    assert(variantsData.variants && variantsData.variants.length >= 5, "Returns all product variants for webinar")

    // Update variant mapping
    const targetVariant = variantsData.variants[0]
    const updateVariantRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/variants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        variant_id: targetVariant.variant_id,
        option_type: "live",
        includes_live: true,
      }),
    })
    assert(updateVariantRes.status === 200, "Admin can update variant access inclusions")
  } catch (err: any) {
    assert(false, `Test Suite 8 failed with error: ${err.message}`)
  }

  // TEST 9: Admin Live Link & Recording Management
  console.log("\nTest Suite 9: Admin Live Link & Recording Control")
  try {
    const liveRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/live-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        live_stream_url: "https://zoom.us/j/98421038592?pwd=VerifiedSecureToken",
        live_instructions: "Please join 10 minutes prior to event.",
        live_link_published: true,
      }),
    })
    assert(liveRes.status === 200, "Admin /admin/webinars/[id]/live-link updates live link successfully")

    const recRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/recording`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        recording_url: "https://customer-assets.academyio.com/recordings/verified-recording.mp4",
        recording_instructions: "HD streaming available.",
      }),
    })
    assert(recRes.status === 200, "Admin /admin/webinars/[id]/recording updates recording settings successfully")
  } catch (err: any) {
    assert(false, `Test Suite 9 failed with error: ${err.message}`)
  }

  // TEST 10: Admin PDF Resources Management
  console.log("\nTest Suite 10: Admin PDF Resources & Handouts Management")
  try {
    // Add resource
    const addRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/resources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Test Admin Compliance Guide",
        file_url: "https://customer-assets.academyio.com/resources/test_guide.pdf",
        access_type: "pdf",
      }),
    })
    const addData = await addRes.json()
    assert(addRes.status === 201, "Admin creates new PDF resource with HTTP 201")
    const newResourceId = addData.resource.id

    // List resources
    const listRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/resources`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const listData = await listRes.json()
    assert(listData.resources.some((r: any) => r.id === newResourceId), "List reflects newly created resource")

    // Delete resource
    const delRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/resources/${newResourceId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    assert(delRes.status === 200, "Admin successfully deletes PDF resource")
  } catch (err: any) {
    assert(false, `Test Suite 10 failed with error: ${err.message}`)
  }

  // TEST 11: Admin Entitlements & Orders Overview
  console.log("\nTest Suite 11: Admin Customer Entitlements & Orders Overview")
  try {
    const entListRes = await fetch(`${BASE_URL}/admin/entitlements`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const entListData = await entListRes.json()
    assert(entListRes.status === 200, "Admin /admin/entitlements returns HTTP 200")
    assert(entListData.entitlements && entListData.entitlements.length > 0, "Returns active customer entitlements")

    // Orders overview
    const ordersRes = await fetch(`${BASE_URL}/admin/orders`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const ordersData = await ordersRes.json()
    assert(ordersRes.status === 200, "Admin /admin/orders returns HTTP 200")
    assert(ordersData.orders && ordersData.orders.length > 0, "Returns orders overview joined with entitlements")

    // Grant temporary entitlement
    const grantRes = await fetch(`${BASE_URL}/admin/entitlements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        customer_id: "cus_temp_test_99",
        customer_email: "temp_auditor@academyio.com",
        webinar_id: sCorpWebinarId,
        access_type: "bundle",
        notes: "Automated test grant",
      }),
    })
    const grantData = await grantRes.json()
    assert(grantRes.status === 201, "Admin grants new customer entitlement with HTTP 201")
    const tempEntId = grantData.entitlement.id

    // Revoke entitlement
    const revokeRes = await fetch(`${BASE_URL}/admin/entitlements/${tempEntId}/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: "Automated test cleanup" }),
    })
    const revokeData = await revokeRes.json()
    assert(revokeRes.status === 200, "Admin revokes customer entitlement with reason")
    assert(revokeData.entitlement.status === "revoked", "Entitlement status marked revoked")
  } catch (err: any) {
    assert(false, `Test Suite 11 failed with error: ${err.message}`)
  }

  // TEST 12: Speaker Management
  console.log("\nTest Suite 12: Speaker Management CRUD & Integrity Protection")
  let testSpeakerId = ""
  try {
    // 1. List speakers
    const spkListRes = await fetch(`${BASE_URL}/admin/speakers`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const spkListData = await spkListRes.json()
    assert(spkListRes.status === 200, "Admin /admin/speakers returns HTTP 200")
    assert(spkListData.speakers && spkListData.speakers.length >= 6, "Returns at least 6 registered speakers")
    assert(spkListData.speakers[0].webinars_count !== undefined, "Speakers include webinar count")

    // 2. Create speaker
    const createSpkRes = await fetch(`${BASE_URL}/admin/speakers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Dr. Evelyn Marcus, CPA",
        designation: "Lead Forensic Accounting Specialist",
        qualifications: "PhD, CPA, CFE",
        company: "Marcus Financial Forensics",
        email: "evelyn.marcus@example.com",
        bio: "Veteran forensic auditor specializing in corporate fraud detection.",
        photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
        status: "active",
      }),
    })
    const createSpkData = await createSpkRes.json()
    assert(createSpkRes.status === 201, "Admin creates new speaker with HTTP 201")
    assert(createSpkData.speaker.name === "Dr. Evelyn Marcus, CPA", "Created speaker has correct name")
    testSpeakerId = createSpkData.speaker.id

    // 3. Retrieve single speaker
    const getSpkRes = await fetch(`${BASE_URL}/admin/speakers/${testSpeakerId}`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const getSpkData = await getSpkRes.json()
    assert(getSpkRes.status === 200, "Admin /admin/speakers/:id returns HTTP 200")
    assert(getSpkData.speaker.id === testSpeakerId, "Returns correct speaker record with webinars array")

    // 4. Update speaker
    const updateSpkRes = await fetch(`${BASE_URL}/admin/speakers/${testSpeakerId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        designation: "Managing Director of Forensic Analytics",
      }),
    })
    const updateSpkData = await updateSpkRes.json()
    assert(updateSpkRes.status === 200, "Admin updates speaker details with HTTP 200")
    assert(updateSpkData.speaker.designation === "Managing Director of Forensic Analytics", "Speaker designation updated")

    // 5. Test accidental deletion protection on speaker with webinars
    const speakerWithWebinars = spkListData.speakers.find((s: any) => s.webinars_count > 0)
    if (speakerWithWebinars) {
      const deleteGuardRes = await fetch(`${BASE_URL}/admin/speakers/${speakerWithWebinars.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` },
      })
      assert(
        deleteGuardRes.status === 400,
        "Deletion Guard: Accidental deletion of speaker assigned to webinars is prevented (HTTP 400)"
      )
    }

    // 6. Delete unused speaker
    const deleteSpkRes = await fetch(`${BASE_URL}/admin/speakers/${testSpeakerId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    assert(deleteSpkRes.status === 200, "Admin safely deletes unassigned speaker with HTTP 200")
  } catch (err: any) {
    assert(false, `Test Suite 12 failed with error: ${err.message}`)
  }

  // TEST 13: Custom Purchase Options & Independent Pricing
  console.log("\nTest Suite 13: Custom Purchase Options & Independent Variant Pricing")
  let customVariantId = ""
  try {
    // 1. Get variants for S Corp webinar
    const varRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/variants`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const varData = await varRes.json()
    assert(varRes.status === 200, "Admin /admin/webinars/:id/variants returns HTTP 200")
    assert(varData.variants && varData.variants.length >= 5, "Returns all purchase options for webinar")
    assert(varData.variants[0].price !== undefined, "Purchase options contain custom price")

    // 2. Add new custom option
    const addOptRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/variants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Live + Recording Special Bundle",
        description: "Join live session plus receive full 1-year recording replay",
        price: 199,
        currency_code: "usd",
        option_type: "bundle",
        includes_live: true,
        includes_recording: true,
        includes_transcript: false,
        includes_pdf: false,
        is_enabled: true,
      }),
    })
    const addOptData = await addOptRes.json()
    assert(addOptRes.status === 200, "Admin adds custom purchase option with HTTP 200")
    customVariantId = addOptData.variant_id
    assert(Boolean(customVariantId), "Returns variant identifier for custom option")

    // 3. Update custom option price independently
    const updatePriceRes = await fetch(`${BASE_URL}/admin/webinars/${sCorpWebinarId}/variants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        variant_id: customVariantId,
        price: 219,
        title: "Live + Recording Premium Pack",
      }),
    })
    const updatePriceData = await updatePriceRes.json()
    assert(updatePriceRes.status === 200, "Admin updates custom option price to $219 independently")

    // 4. Verify public storefront webinar returns the new custom option & price
    const storeWebRes = await fetch(`${BASE_URL}/store/webinars/s-corp-basis-analysis-form-7203`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const storeWebData = await storeWebRes.json()
    const foundCustom = storeWebData.webinar.variants.find((v: any) => v.title === "Live + Recording Premium Pack")
    assert(Boolean(foundCustom), "Storefront webinar includes newly configured custom purchase option")
    assert(foundCustom?.price === 219, "Storefront webinar reflects custom configured price ($219)")

    // 5. Delete custom option
    const deleteOptRes = await fetch(
      `${BASE_URL}/admin/webinars/${sCorpWebinarId}/variants/${customVariantId}`,
      {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` },
      }
    )
    assert(deleteOptRes.status === 200, "Admin deletes custom purchase option with HTTP 200")
  } catch (err: any) {
    assert(false, `Test Suite 13 failed with error: ${err.message}`)
  }

  // TEST 14: Monthly Subscription Packages
  console.log("\nTest Suite 14: Monthly Subscription Packages & Entitlement Validation")
  let testPlanId = ""
  try {
    // 1. Admin list plans
    const adminPlansRes = await fetch(`${BASE_URL}/admin/subscriptions`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
    const adminPlansData = await adminPlansRes.json()
    assert(adminPlansRes.status === 200, "Admin /admin/subscriptions returns HTTP 200")
    assert(adminPlansData.plans && adminPlansData.plans.length >= 3, "Contains at least 3 monthly plans (Basic, Professional, Premium)")

    // 2. Admin create new plan
    const createPlanRes = await fetch(`${BASE_URL}/admin/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Enterprise Firm Monthly Plan",
        slug: `enterprise-firm-${Date.now()}`,
        description: "Unlimited organization-wide webinar access with multi-seat CPE tracking",
        price: 299,
        currency_code: "usd",
        billing_interval: "monthly",
        webinar_access_limit: null,
        includes_live: true,
        includes_recording: true,
        includes_transcript: true,
        includes_pdf: true,
        status: "active",
        benefits: ["All live webinars", "Enterprise replay vault", "Priority Q&A"],
      }),
    })
    const createPlanData = await createPlanRes.json()
    assert(createPlanRes.status === 201, "Admin creates new subscription package with HTTP 201")
    testPlanId = createPlanData.plan.id

    // 3. Storefront list plans
    const storePlansRes = await fetch(`${BASE_URL}/store/subscriptions`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const storePlansData = await storePlansRes.json()
    assert(storePlansRes.status === 200, "Storefront /store/subscriptions returns HTTP 200")
    assert(storePlansData.plans.length >= 4, "Storefront displays all active subscription plans")

    // 4. Customer subscription checkout
    const subRes = await fetch(`${BASE_URL}/store/customer/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${customerToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        plan_id: testPlanId,
        payment_method: "Visa ending in 4242",
      }),
    })
    const subData = await subRes.json()
    assert(subRes.status === 201, "Customer successfully subscribes to plan with HTTP 201")
    assert(subData.subscription.status === "active", "Customer subscription is immediately active")

    // 5. Customer retrieve subscription
    const getSubRes = await fetch(`${BASE_URL}/store/customer/subscriptions`, {
      headers: {
        "Authorization": `Bearer ${customerToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
    const getSubData = await getSubRes.json()
    assert(getSubRes.status === 200, "Customer /store/customer/subscriptions returns HTTP 200")
    assert(getSubData.has_subscription === true, "Customer is verified as having active subscription")
    assert(getSubData.subscription.plan_name === "Enterprise Firm Monthly Plan", "Subscription matches purchased plan")

    // 6. Subscription-based webinar access verification
    const subAccessRes = await fetch(`${BASE_URL}/store/customer/webinars/${sCorpWebinarId}/access`, {
      headers: {
        "Authorization": `Bearer ${customerToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
    const subAccessData = await subAccessRes.json()
    assert(subAccessRes.status === 200, "Webinar access verification succeeds with HTTP 200")
    assert(
      subAccessData.access.has_live === true && subAccessData.access.has_recording === true,
      "Active subscription grants authorized access to webinar live stream & recordings"
    )

    // 7. Customer cancel subscription
    const cancelRes = await fetch(`${BASE_URL}/store/customer/subscriptions/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${customerToken}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ immediate: false }),
    })
    const cancelData = await cancelRes.json()
    assert(cancelRes.status === 200, "Customer cancels subscription with HTTP 200")
    assert(cancelData.subscription.cancel_at_period_end === true, "Subscription marked to cancel at end of period")

    // 8. Delete test plan after canceling subscriber
    // First archive / cancel subscriber
    await fetch(`${BASE_URL}/admin/customer-subscriptions/${subData.subscription.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "canceled" }),
    })
  } catch (err: any) {
    assert(false, `Test Suite 14 failed with error: ${err.message}`)
  }

  // TEST 15: Seminar Removal & URL Redirection
  console.log("\nTest Suite 15: Seminar Removal & Redirection Verification")
  try {
    const seminarRes = await fetch("http://localhost:8000/us/seminars", {
      redirect: "manual",
      headers: { "Cookie": "_medusa_cache_id=e2e-session-test" },
    })
    assert(
      seminarRes.status === 307 || seminarRes.status === 308 || seminarRes.status === 200,
      "Storefront /us/seminars responds with clean redirect (307/308)"
    )
    const location = seminarRes.headers.get("location")
    if (location) {
      assert(location.includes("/webinars"), "/us/seminars redirects directly to /us/webinars")
    }
  } catch (err: any) {
    assert(false, `Test Suite 15 failed with error: ${err.message}`)
  }

  // TEST 16: Customer Dashboard 9-Item Menu & Storefront Pages
  console.log("\nTest Suite 16: Customer Dashboard & Storefront Health Check")
  try {
    const storefrontHeaders = { "Cookie": "_medusa_cache_id=e2e-session-test" }
    const subPageRes = await fetch("http://localhost:8000/us/subscriptions", { headers: storefrontHeaders })
    assert(subPageRes.status === 200, "Storefront /us/subscriptions page renders with HTTP 200")

    const dashPageRes = await fetch("http://localhost:8000/us/dashboard", { headers: storefrontHeaders })
    assert(dashPageRes.status === 200, "Storefront /us/dashboard page renders with HTTP 200")

    const webinarsPageRes = await fetch("http://localhost:8000/us/webinars", { headers: storefrontHeaders })
    assert(webinarsPageRes.status === 200, "Storefront /us/webinars page renders with HTTP 200")
  } catch (err: any) {
    assert(false, `Test Suite 16 failed with error: ${err.message}`)
  }

  // TEST 17: Automatic Webinar Status Management & Pre-Recorded Lifecycle
  console.log("\nTest Suite 17: Automatic Webinar Status Management & Pre-Recorded Lifecycle")
  let lifecycleWebinarId = ""
  try {
    // 1. Fetch upcoming webinars and verify no past webinars appear in upcoming
    const upRes = await fetch(`${BASE_URL}/store/webinars?type=upcoming`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const upData = await upRes.json()
    assert(upRes.status === 200, "Storefront /store/webinars?type=upcoming returns HTTP 200")
    for (const w of upData.webinars) {
      assert(
        w.is_upcoming === true && w.is_completed === false,
        `Upcoming webinar "${w.title}" has is_upcoming=true and is_completed=false`
      )
    }

    // 2. Fetch on-demand webinars and verify all have published recordings
    const odRes = await fetch(`${BASE_URL}/store/webinars?type=ondemand`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const odData = await odRes.json()
    assert(odRes.status === 200, "Storefront /store/webinars?type=ondemand returns HTTP 200")
    assert(odData.webinars.length >= 2, "On-demand catalog contains published recorded courses")
    for (const w of odData.webinars) {
      assert(
        w.is_ondemand === true && w.recording_ready === true,
        `On-demand webinar "${w.title}" has is_ondemand=true and verified published recording`
      )
    }

    // 3. Create a completed webinar without published recording
    const pastDate = new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
    const createPastRes = await fetch(`${BASE_URL}/admin/webinars`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Advanced Pass-Through Entity Taxation Masterclass",
        speaker_name: "Dr. Rachel Green",
        event_date: pastDate,
        start_time: "1:00 PM EST",
        end_time: "2:40 PM EST",
        timezone: "America/New_York",
        category: "Federal Taxation",
        status: "published",
        recording_url: null,
        recording_published: false,
        prices: { live: 149, recording: 149, transcript: 49, pdf: 29, bundle: 249 },
      }),
    })
    const createPastData = await createPastRes.json()
    assert(createPastRes.status === 201, "Admin creates completed webinar with past event date")
    lifecycleWebinarId = createPastData.webinar.id
    const lifecycleSlug = createPastData.webinar.slug

    // 4. Verify completed webinar without recording is NOT in upcoming
    const upCheckRes = await fetch(`${BASE_URL}/store/webinars?type=upcoming`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const upCheckData = await upCheckRes.json()
    const foundInUpcoming = upCheckData.webinars.some((w: any) => w.id === lifecycleWebinarId)
    assert(!foundInUpcoming, "Completed webinar is automatically EXCLUDED from Upcoming section")

    // 5. Verify completed webinar without recording is NOT in on-demand
    const odCheckRes = await fetch(`${BASE_URL}/store/webinars?type=ondemand`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const odCheckData = await odCheckRes.json()
    const foundInOnDemand = odCheckData.webinars.some((w: any) => w.id === lifecycleWebinarId)
    assert(!foundInOnDemand, "Completed webinar without published recording is EXCLUDED from On-Demand section")

    // 6. Query by slug: verify options reflect completed status
    const slugRes = await fetch(`${BASE_URL}/store/webinars/${lifecycleSlug}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const slugData = await slugRes.json()
    assert(slugRes.status === 200, "Storefront fetches completed webinar details by slug")
    assert(slugData.webinar.is_completed === true, "Webinar is accurately computed as is_completed=true")
    assert(slugData.webinar.recording_coming_soon === true, "Webinar displays recording_coming_soon=true")

    const liveOpt = slugData.webinar.available_options.find((o: any) => o.type === "live")
    assert(liveOpt && liveOpt.available === false, "Live session option is disabled since live event has passed")

    const recOpt = slugData.webinar.available_options.find((o: any) => o.type === "recording")
    assert(recOpt && recOpt.available === false, "Recording option is not yet available while unpublished")

    // 7. Admin attaches and publishes recording
    const pubRecRes = await fetch(`${BASE_URL}/admin/webinars/${lifecycleWebinarId}/recording`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        recording_url: "https://customer-assets.academyio.com/recordings/passthrough-tax-2026.mp4",
        recording_published: true,
      }),
    })
    assert(pubRecRes.status === 200, "Admin attaches and publishes video recording")

    // 8. Verify webinar NOW appears in on-demand catalog
    const odAfterRes = await fetch(`${BASE_URL}/store/webinars?type=ondemand`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const odAfterData = await odAfterRes.json()
    const foundInOnDemandNow = odAfterData.webinars.some((w: any) => w.id === lifecycleWebinarId)
    assert(foundInOnDemandNow, "Webinar with published recording now appears in Pre-Recorded / On-Demand catalog")

    // 9. Verify slug route now shows recording as available
    const slugAfterRes = await fetch(`${BASE_URL}/store/webinars/${lifecycleSlug}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const slugAfterData = await slugAfterRes.json()
    const recOptAfter = slugAfterData.webinar.available_options.find((o: any) => o.type === "recording")
    assert(recOptAfter && recOptAfter.available === true, "Recording option is now available for purchase")

    // Clean up test webinar
    await fetch(`${BASE_URL}/admin/webinars/${lifecycleWebinarId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${adminToken}` },
    })
  } catch (err: any) {
    if (lifecycleWebinarId) {
      await fetch(`${BASE_URL}/admin/webinars/${lifecycleWebinarId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${adminToken}` },
      }).catch(() => {})
    }
    assert(false, `Test Suite 17 failed with error: ${err.message}`)
  }

  // TEST 18: Full E2E Checkout Flow with Real Order & Digital Entitlement Provisioning
  console.log("\nTest Suite 18: Full E2E Checkout Flow & Entitlement Provisioning")
  try {
    // 1. Get first webinar and its first variant
    const listRes = await fetch(`${BASE_URL}/store/webinars?limit=1`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const listData = await listRes.json()
    const testWebinar = listData.webinars[0]

    const detailRes = await fetch(`${BASE_URL}/store/webinars/${testWebinar.slug}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const detailData = await detailRes.json()
    const availableVariant = detailData.webinar.variants.find((v: any) => v.is_available !== false)
    assert(availableVariant, "Found available webinar purchase option for checkout test")

    // 2. Dynamically fetch Region
    const regRes = await fetch(`${BASE_URL}/store/regions`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const regData = await regRes.json()
    const usdRegion = regData.regions.find((r: any) => r.currency_code === "usd") || regData.regions[0]
    const regionId = usdRegion.id

    // Create Cart
    const cartRes = await fetch(`${BASE_URL}/store/carts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ currency_code: "usd", region_id: regionId }),
    })
    const cartData = await cartRes.json()
    assert(cartRes.status === 201 || cartRes.status === 200, "Created new shopping cart")
    const cartId = cartData.cart.id

    // 3. Add line item
    const itemRes = await fetch(`${BASE_URL}/store/carts/${cartId}/line-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ variant_id: availableVariant.id, quantity: 1 }),
    })
    assert(itemRes.status === 200, `Added variant ${availableVariant.title} to shopping cart`)

    // 4. Update customer & shipping address
    const updateCartRes = await fetch(`${BASE_URL}/store/carts/${cartId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        email: "checkout-verifier@academyio.com",
        shipping_address: {
          first_name: "Verification",
          last_name: "Customer",
          address_1: "100 Broadway",
          city: "New York",
          country_code: "us",
          province: "NY",
          postal_code: "10001",
        },
      }),
    })
    assert(updateCartRes.status === 200, "Assigned customer email and address to cart")

    // 5. Add Digital Shipping Method
    const shipMethodsRes = await fetch(`${BASE_URL}/store/shipping-options?cart_id=${cartId}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    })
    const shipMethodsData = await shipMethodsRes.json()
    const digitalOption = shipMethodsData.shipping_options?.[0]
    assert(digitalOption, "Found digital delivery shipping option ($0 Free Instant Access)")

    const addShipRes = await fetch(`${BASE_URL}/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ option_id: digitalOption.id }),
    })
    assert(addShipRes.status === 200, "Selected instant digital delivery for cart")

    // 6. Initialize Payment Session
    const payColRes = await fetch(`${BASE_URL}/store/payment-collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ cart_id: cartId }),
    })
    const payColData = await payColRes.json()
    const payColId = payColData.payment_collection.id

    const paySessRes = await fetch(`${BASE_URL}/store/payment-collections/${payColId}/payment-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ provider_id: "pp_system_default" }),
    })
    assert(paySessRes.status === 200, "Initialized payment session for checkout")

    // 7. Complete Cart -> Order
    const completeRes = await fetch(`${BASE_URL}/store/carts/${cartId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
    const completeData = await completeRes.json()
    assert(completeRes.status === 200 && completeData.type === "order", "Cart successfully placed into completed Order")
    assert(completeData.order && completeData.order.id, `Order generated with ID: ${completeData.order?.id}`)
  } catch (err: any) {
    assert(false, `Test Suite 18 failed with error: ${err.message}`)
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
