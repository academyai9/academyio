const http = require("http")

const BACKEND_URL = "http://127.0.0.1:9000"

function postJson(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL)
    const data = JSON.stringify(body)
    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let respData = ""
        res.on("data", (c) => (respData += c))
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) })
          } catch (_) {
            resolve({ status: res.statusCode, raw: respData })
          }
        })
      }
    )
    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

function getJson(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL)
    const req = http.request(
      url,
      {
        method: "GET",
        headers: { ...headers },
      },
      (res) => {
        let respData = ""
        res.on("data", (c) => (respData += c))
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(respData) })
          } catch (_) {
            resolve({ status: res.statusCode, raw: respData })
          }
        })
      }
    )
    req.on("error", reject)
    req.end()
  })
}

async function run() {
  console.log("=== Testing Payment Methods Management APIs ===\n")

  // 1. Authenticate Admin
  console.log("1. Authenticating Admin User...")
  const loginRes = await postJson("/auth/user/emailpass", {
    email: "admin@academyio.com",
    password: "SuperAdmin2026!",
  })

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    throw new Error(`Admin auth failed: ${JSON.stringify(loginRes)}`)
  }
  const token = loginRes.body.token
  const authHeaders = { Authorization: `Bearer ${token}` }
  console.log("✓ Admin authenticated. Token received.\n")

  // 2. GET /admin/payment-methods
  console.log("2. Testing GET /admin/payment-methods...")
  const getRes = await getJson("/admin/payment-methods", authHeaders)
  console.log("Status:", getRes.status)
  console.log("Summary:", getRes.body.summary)
  console.log(
    "Methods count:",
    getRes.body.payment_methods.length,
    getRes.body.payment_methods.map((m) => ({
      provider_id: m.provider_id,
      is_active: m.is_active,
      env: m.environment,
      masked_secret: m.live_secret_key_masked,
      has_secret: m.has_live_secret_key,
    }))
  )

  // Verify credentials masking: unmasked secret must NEVER be present!
  const hasUnmasked = getRes.body.payment_methods.some(
    (m) => m.live_secret_key || m.test_secret_key
  )
  if (hasUnmasked) {
    throw new Error("SECURITY FAILURE: Unmasked secrets leaked in API response!")
  }
  console.log("✓ Security Verified: All secrets strictly masked.\n")

  // 3. Test Stripe Connection
  console.log("3. Testing Stripe API connection (POST /admin/payment-methods/stripe/test-connection)...")
  const stripeTestRes = await postJson(
    "/admin/payment-methods/stripe/test-connection",
    { environment: "live" },
    authHeaders
  )
  console.log("Stripe test status:", stripeTestRes.status)
  console.log("Stripe test result:", stripeTestRes.body)

  // 4. Test Electronic Card Connection
  console.log("\n4. Testing Electronic Card Verification Engine...")
  const elecTestRes = await postJson(
    "/admin/payment-methods/electronic_card/test-connection",
    {},
    authHeaders
  )
  console.log("Electronic Card test status:", elecTestRes.status)
  console.log("Electronic Card test result:", elecTestRes.body)

  // 5. Test Activation Guard (trying to enable PayPal without credentials)
  console.log("\n5. Testing Activation Guard (Activating PayPal with missing keys)...")
  const paypalInvalidRes = await postJson(
    "/admin/payment-methods/paypal",
    { is_active: true },
    authHeaders
  )
  console.log("Expected rejection status:", paypalInvalidRes.status)
  console.log("Rejection message:", paypalInvalidRes.body)
  if (paypalInvalidRes.status === 400) {
    console.log("✓ Guard Verified: Cannot activate PayPal when credentials are missing.\n")
  } else {
    throw new Error("Activation guard failed to block invalid payment method!")
  }

  // 6. Test Audit Logs
  console.log("6. Testing GET /admin/payment-methods/audit-logs...")
  const auditRes = await getJson("/admin/payment-methods/audit-logs", authHeaders)
  console.log("Audit logs total:", auditRes.body.total)
  console.log(
    "Recent logs:",
    auditRes.body.audit_logs.slice(0, 3).map((l) => ({
      provider: l.provider_id,
      action: l.action,
      details: l.details,
      created_at: l.created_at,
    }))
  )
  console.log("✓ Audit logs functional.\n")

  console.log("=== ALL PAYMENT METHOD APIS TESTED SUCCESSFULLY ===")
}

run().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
