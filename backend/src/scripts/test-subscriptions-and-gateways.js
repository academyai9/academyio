const { Client } = require("pg")

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"
const DATABASE_URL = process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa"

async function runTests() {
  console.log("================================================================================")
  console.log("   ACADEMYIO SUBSCRIPTIONS CHECKOUT & PAYMENT GATEWAYS VERIFICATION SUITE       ")
  console.log("================================================================================")

  let passed = 0
  let failed = 0

  function assert(desc, condition) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${desc}`)
      failed++
    }
  }

  // 1. Check database payment methods config
  console.log("\n--- TEST 1: Database Payment Method Configurations ---")
  const dbClient = new Client({ connectionString: DATABASE_URL })
  await dbClient.connect()

  const pmRes = await dbClient.query(`
    SELECT provider_id, display_title, is_active, environment, verification_mode
    FROM payment_method_config
    ORDER BY provider_id;
  `)
  const providers = pmRes.rows
  console.log(`Found ${providers.length} payment methods in database:`)
  providers.forEach((p) => {
    console.log(`  - [${p.is_active ? "ACTIVE" : "INACTIVE"}] ${p.provider_id}: "${p.display_title}" (${p.environment})`)
  })

  const hasStripeInDb = providers.some((p) => p.provider_id === "stripe" && p.is_active)
  const hasPayPalInDb = providers.some((p) => p.provider_id === "paypal" && p.is_active)
  const hasElectronicInDb = providers.some((p) => p.provider_id === "electronic_card" && p.is_active)

  assert("Stripe is active in database", hasStripeInDb)
  assert("PayPal is active in database", hasPayPalInDb)
  assert("Electronic Card Payment & Instant Verification is active in database", hasElectronicInDb)

  // 2. Test Storefront Payment Methods API
  console.log("\n--- TEST 2: /store/payment-methods-config API ---")
  const pmApiRes = await fetch(`${BACKEND_URL}/store/payment-methods-config`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  })
  assert("Store payment methods endpoint returned HTTP 200", pmApiRes.ok)
  const pmData = await pmApiRes.json()
  const activeMethods = pmData.payment_methods || []
  console.log(`Active methods returned by store API (${activeMethods.length}):`)
  activeMethods.forEach((m) => console.log(`  - ${m.provider_id}: ${m.display_title}`))

  assert("Stripe is returned in active payment methods", activeMethods.some((m) => m.provider_id === "stripe"))
  assert("PayPal is returned in active payment methods", activeMethods.some((m) => m.provider_id === "paypal"))
  assert("Electronic Card is returned in active payment methods", activeMethods.some((m) => m.provider_id === "electronic_card"))

  // 3. Test Subscription Plans API
  console.log("\n--- TEST 3: /store/subscriptions API ---")
  const plansRes = await fetch(`${BACKEND_URL}/store/subscriptions`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  })
  assert("Subscription plans endpoint returned HTTP 200", plansRes.ok)
  const plansData = await plansRes.json()
  const plans = plansData.plans || []
  console.log(`Found ${plans.length} active subscription plans:`)
  plans.forEach((p) => console.log(`  - ${p.id}: ${p.name} ($${p.price}/${p.billing_interval})`))
  assert("Multiple active subscription plans exist", plans.length > 0)
  const targetPlan = plans[0]

  // 4. Test Subscription Checkout with Stripe
  console.log("\n--- TEST 4: Subscription Checkout with Stripe Gateway ---")
  const stripeTestEmail = `stripe_sub_${Date.now()}@test.academyio.com`
  const stripeSubRes = await fetch(`${BACKEND_URL}/store/customer/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      plan_id: targetPlan.id,
      customer_email: stripeTestEmail,
      payment_provider_id: "stripe",
      payment_method: "Stripe (Visa •••• 4242)",
      card_brand: "visa",
      last4: "4242",
      verification_mode: "instant_3ds_verification",
    }),
  })
  assert("Stripe subscription creation returned HTTP 201", stripeSubRes.status === 201)
  const stripeSubData = await stripeSubRes.json()
  const stripeSub = stripeSubData.subscription
  assert("Stripe subscription ID generated", Boolean(stripeSub?.id))
  assert("Stripe subscription status is active", stripeSub?.status === "active")
  assert("Stripe provider is recorded", stripeSub?.payment_provider_id === "stripe")
  assert("Stripe summary is recorded", stripeSub?.payment_method_summary?.includes("Stripe"))

  // 5. Test Subscription Checkout with PayPal
  console.log("\n--- TEST 5: Subscription Checkout with PayPal Gateway ---")
  const paypalTestEmail = `paypal_sub_${Date.now()}@test.academyio.com`
  const paypalSubRes = await fetch(`${BACKEND_URL}/store/customer/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      plan_id: targetPlan.id,
      customer_email: paypalTestEmail,
      payment_provider_id: "paypal",
      payment_method: `PayPal Express (${paypalTestEmail})`,
      verification_mode: "oauth2_instant_approval",
    }),
  })
  assert("PayPal subscription creation returned HTTP 201", paypalSubRes.status === 201)
  const paypalSubData = await paypalSubRes.json()
  const paypalSub = paypalSubData.subscription
  assert("PayPal subscription ID generated", Boolean(paypalSub?.id))
  assert("PayPal subscription status is active", paypalSub?.status === "active")
  assert("PayPal provider is recorded", paypalSub?.payment_provider_id === "paypal")
  assert("PayPal summary is recorded", paypalSub?.payment_method_summary?.includes("PayPal"))

  // 6. Test Subscription Checkout with Electronic Card Payment & Instant Verification
  console.log("\n--- TEST 6: Subscription Checkout with Electronic Card & Instant Verification ---")
  const ecTestEmail = `ec_sub_${Date.now()}@test.academyio.com`
  const ecSubRes = await fetch(`${BACKEND_URL}/store/customer/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      plan_id: targetPlan.id,
      customer_email: ecTestEmail,
      payment_provider_id: "electronic_card",
      payment_method: "Electronic Card [Instant Verified] (Mastercard •••• 5555)",
      card_brand: "mastercard",
      last4: "5555",
      cardholder_name: "Dr. Alexander Wright",
      verification_mode: "instant_verification",
    }),
  })
  assert("Electronic Card subscription creation returned HTTP 201", ecSubRes.status === 201)
  const ecSubData = await ecSubRes.json()
  const ecSub = ecSubData.subscription
  assert("Electronic Card subscription ID generated", Boolean(ecSub?.id))
  assert("Electronic Card subscription status is active", ecSub?.status === "active")
  assert("Electronic Card provider is recorded", ecSub?.payment_provider_id === "electronic_card")
  assert("Electronic Card Instant Verified summary is recorded", ecSub?.payment_method_summary?.includes("Instant Verified"))
  assert("Electronic Card metadata records instant verification mode", ecSub?.metadata?.verification_mode === "instant_verification")

  // 7. Test Customer Query for Subscription Status
  console.log("\n--- TEST 7: Customer Subscription Retrieval API ---")
  const getSubRes = await fetch(`${BACKEND_URL}/store/customer/subscriptions?customer_email=${encodeURIComponent(ecTestEmail)}`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  })
  assert("Customer subscription status endpoint returned HTTP 200", getSubRes.ok)
  const getSubData = await getSubRes.json()
  assert("Customer is recognized as having active subscription", getSubData.has_subscription === true)
  assert("Retrieved subscription matches created ID", getSubData.subscription?.id === ecSub.id)

  // 8. Test Admin Subscribers List
  console.log("\n--- TEST 8: Admin Subscribers List API ---")
  let adminToken = ""
  try {
    const adminLoginRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@academyio.com",
        password: "SuperAdmin2026!",
      }),
    })
    if (adminLoginRes.ok) {
      const authData = await adminLoginRes.json()
      adminToken = authData.token
    }
  } catch (e) {
    console.warn("Could not login as admin:", e.message)
  }

  const adminHeaders = adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
  const adminSubsRes = await fetch(`${BACKEND_URL}/admin/customer-subscriptions`, {
    headers: adminHeaders,
  })
  assert("Admin customer subscriptions endpoint returned HTTP 200", adminSubsRes.ok)
  const adminSubsData = await adminSubsRes.json()
  const allSubs = adminSubsData.subscriptions || []
  assert("Admin sees all subscriptions", allSubs.length >= 3)
  const foundStripe = allSubs.find((s) => s.id === stripeSub.id)
  const foundPayPal = allSubs.find((s) => s.id === paypalSub.id)
  const foundEC = allSubs.find((s) => s.id === ecSub.id)
  assert("Admin list includes Stripe subscriber", Boolean(foundStripe))
  assert("Admin list includes PayPal subscriber", Boolean(foundPayPal))
  assert("Admin list includes Electronic Card subscriber", Boolean(foundEC))

  // 9. Test Storefront Web Pages
  console.log("\n--- TEST 9: Storefront Pages Availability (Port 8000) ---")
  try {
    const checkoutPageRes = await fetch(`http://localhost:8000/us/subscriptions/checkout?plan_id=${targetPlan.id}`)
    assert("Subscription checkout page returns HTTP 200", checkoutPageRes.ok)

    const confirmedPageRes = await fetch(`http://localhost:8000/us/subscriptions/confirmed?subscription_id=${ecSub.id}&plan_id=${targetPlan.id}`)
    assert("Subscription confirmed celebration page returns HTTP 200", confirmedPageRes.ok)

    const plansPageRes = await fetch(`http://localhost:8000/us/subscriptions`)
    assert("Subscription plans page returns HTTP 200", plansPageRes.ok)
  } catch (err) {
    assert(`Storefront pages check succeeded: ${err.message}`, false)
  }

  await dbClient.end()

  console.log("\n================================================================================")
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log("================================================================================")

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
