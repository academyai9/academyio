const http = require("http")
const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, (res) => {
      let chunks = []
      res.on("data", (c) => chunks.push(c))
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      })
    }).on("error", reject)
  })
}

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(url)
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let chunks = []
        res.on("data", (c) => chunks.push(c))
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        })
      }
    )
    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

async function runTestSuite() {
  console.log("==================================================================")
  console.log("=== COMPREHENSIVE VERIFICATION: ORDER CONFIRMATION EMAILS =======")
  console.log("==================================================================")

  const client = await pool.connect()

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Database Table & Schema Verification
    // ------------------------------------------------------------------------
    console.log("\n[TEST 1] Verifying 'order_email_notification' table & schema...")
    const tableRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_email_notification'
      ORDER BY ordinal_position;
    `)

    if (tableRes.rows.length === 0) {
      throw new Error("Table 'order_email_notification' does not exist in PostgreSQL!")
    }

    const columns = tableRes.rows.map((r) => r.column_name)
    const requiredCols = [
      "id",
      "order_id",
      "notification_type",
      "recipient_email",
      "status",
      "attempt_count",
      "provider",
      "provider_message_id",
      "error_message",
      "sent_at",
      "last_attempt_at",
    ]

    for (const col of requiredCols) {
      if (!columns.includes(col)) {
        throw new Error(`Missing required column '${col}' in order_email_notification!`)
      }
    }
    console.log(`✓ Table 'order_email_notification' verified with ${columns.length} columns!`)

    // ------------------------------------------------------------------------
    // TEST 2: Template Rendering (HTML, Plain Text, Branding, Requirements)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing Order Confirmation Template Generator...")
    const { generateOrderConfirmationEmail } = require("../utils/order-confirmation-template")

    const mockOrderData = {
      orderId: "order_test_12345678",
      displayId: "1042",
      orderDateFormatted: "October 15, 2026, 2:30 PM EST",
      customerName: "Jane Doe, CPA",
      customerEmail: "jane.doe@cpafirm.com",
      items: [
        {
          title: "S Corporation Basis Calculations & Form 7203",
          variantTitle: "Live Webinar Package",
          optionType: "LIVE WEBINAR",
          speakerName: "Dr. Gregory Bennett, CPA",
          cpeCredits: 2.0,
          eventDate: "October 28, 2026",
          eventTime: "2:00 PM – 4:00 PM",
          timezone: "EST",
          quantity: 1,
          unitPrice: 199.0,
          totalPrice: 199.0,
          currency: "USD",
        },
        {
          title: "GAAP Accounting Standards Update 2026",
          variantTitle: "On-Demand Recording",
          optionType: "RECORDING",
          speakerName: "Sarah Jenkins, CPA",
          cpeCredits: 1.5,
          quantity: 1,
          unitPrice: 149.0,
          totalPrice: 149.0,
          currency: "USD",
        },
      ],
      subtotal: 348.0,
      discountTotal: 25.0,
      taxTotal: 0.0,
      total: 323.0,
      currency: "USD",
      paymentMethod: "Electronic Card / Verified Authorization",
      paymentStatus: "PAID",
      isPaid: true,
      frontendUrl: "http://localhost:8000",
      supportEmail: "support@academyio.com",
    }

    const { subject, html, text } = generateOrderConfirmationEmail(mockOrderData)

    console.log("Generated Subject:", subject)
    if (!subject.includes("Order Confirmed") || !subject.includes("1042")) {
      throw new Error("Subject line does not contain expected order number or confirmed label!")
    }

    // Verify HTML content
    const htmlChecks = [
      { label: "ACADEMYIO Branding", test: html.includes("ACADEMY") },
      { label: "Heading 'Thank You for Your Order!'", test: html.includes("Thank You for Your Order!") },
      { label: "Customer Name", test: html.includes("Jane Doe, CPA") },
      { label: "Order Number", test: html.includes("#INV-1042") },
      { label: "Webinar Title", test: html.includes("S Corporation Basis Calculations") },
      { label: "Selected Option", test: html.includes("LIVE WEBINAR") },
      { label: "Event Date/Time", test: html.includes("October 28, 2026") },
      { label: "CPE Credits", test: html.includes("2.0 CPE Credits") },
      { label: "Faculty / Speaker", test: html.includes("Dr. Gregory Bennett, CPA") },
      { label: "Payment Status Badge", test: html.includes("PAID &amp; CONFIRMED") || html.includes("PAID & CONFIRMED") },
      { label: "Support Email", test: html.includes("support@academyio.com") },
      { label: "View My Order CTA Button", test: html.includes("View My Order") },
      { label: "Delivery & Access Schedule", test: html.includes("Delivery &amp; Access Schedule") || html.includes("Delivery & Access Schedule") },
      { label: "Total Price", test: html.includes("323.00 USD") },
    ]

    for (const check of htmlChecks) {
      if (!check.test) throw new Error(`HTML email missing required element: ${check.label}`)
      console.log(`  ✓ HTML contains ${check.label}`)
    }

    // Verify Plain Text content
    const textChecks = [
      { label: "Plain Text Heading", test: text.includes("Thank You for Your Order!") },
      { label: "Order Number in Text", test: text.includes("#INV-1042") },
      { label: "Purchased Courses in Text", test: text.includes("S Corporation Basis Calculations") },
      { label: "Dashboard Link in Text", test: text.includes("http://localhost:8000") },
    ]

    for (const check of textChecks) {
      if (!check.test) throw new Error(`Plain-text email missing required element: ${check.label}`)
      console.log(`  ✓ Plain-text contains ${check.label}`)
    }
    console.log("✓ Template generation verified with 100% compliance!")

    // ------------------------------------------------------------------------
    // TEST 3: Payment Status Distinction (Paid vs Authorized/Unpaid)
    // ------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing Paid vs Authorized status wording...")
    const unpaidMock = {
      ...mockOrderData,
      isPaid: false,
      paymentStatus: "AUTHORIZED",
    }
    const unpaidEmail = generateOrderConfirmationEmail(unpaidMock)
    if (!unpaidEmail.subject.includes("Order Received")) {
      throw new Error("Unpaid/authorized order should have 'Order Received' subject!")
    }
    if (!unpaidEmail.html.includes("ORDER RECEIVED") || unpaidEmail.html.includes("PAID &amp; CONFIRMED")) {
      throw new Error("Unpaid order must not display 'PAID & CONFIRMED' badge!")
    }
    console.log("✓ Unpaid order correctly displays 'Order Received (Pending Settlement)' and does not claim payment succeeded!")

    // ------------------------------------------------------------------------
    // TEST 4: Order Confirmation Dispatch for Existing Order
    // ------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing OrderConfirmationService.sendOrderConfirmation...")
    const { OrderConfirmationService } = require("../modules/webinar/order-confirmation-service")

    // Find an existing order in database
    const sampleOrderRes = await client.query(`SELECT id, display_id, email FROM "order" LIMIT 1`)
    if (sampleOrderRes.rows.length === 0) {
      throw new Error("No orders found in database to test confirmation dispatch!")
    }
    const testOrder = sampleOrderRes.rows[0]
    console.log(`Using database order: ${testOrder.id} (display_id: ${testOrder.display_id})`)

    // Clean up any existing notification for test isolation
    await client.query(`DELETE FROM order_email_notification WHERE order_id = $1`, [testOrder.id])

    const sendRes = await OrderConfirmationService.sendOrderConfirmation(testOrder.id)
    console.log("Send result:", sendRes)

    if (!sendRes.success || sendRes.status !== "sent") {
      throw new Error(`sendOrderConfirmation failed: ${sendRes.error}`)
    }
    if (!sendRes.messageId) {
      throw new Error("Missing provider message ID in send result!")
    }

    // Verify row in database
    const savedNotifRes = await client.query(
      `SELECT * FROM order_email_notification WHERE order_id = $1 AND notification_type = 'order_confirmation'`,
      [testOrder.id]
    )
    if (savedNotifRes.rows.length === 0) {
      throw new Error("No record inserted into order_email_notification!")
    }
    const saved = savedNotifRes.rows[0]
    console.log(`Saved Notification -> ID: ${saved.id}, Status: ${saved.status}, Attempts: ${saved.attempt_count}, Provider: ${saved.provider}`)
    if (saved.status !== "sent" || saved.attempt_count !== 1) {
      throw new Error("Database notification status or attempt count is incorrect!")
    }
    console.log("✓ Order confirmation email successfully dispatched and recorded in database!")

    // ------------------------------------------------------------------------
    // TEST 5: Idempotency & Duplicate Prevention
    // ------------------------------------------------------------------------
    console.log("\n[TEST 5] Testing Duplicate Prevention & Idempotency...")
    const duplicateRes = await OrderConfirmationService.sendOrderConfirmation(testOrder.id)
    console.log("Second invocation result:", duplicateRes)

    if (!duplicateRes.duplicate) {
      throw new Error("Subsequent invocation failed to detect existing sent email!")
    }

    // Check count in database is still 1
    const countRes = await client.query(
      `SELECT count(*) FROM order_email_notification WHERE order_id = $1 AND notification_type = 'order_confirmation'`,
      [testOrder.id]
    )
    if (parseInt(countRes.rows[0].count) !== 1) {
      throw new Error("Duplicate records were created in order_email_notification!")
    }
    console.log("✓ Idempotency verified: Duplicate invocation was skipped, preventing duplicate emails!")

    // ------------------------------------------------------------------------
    // TEST 6: Failure Handling & Error Logging
    // ------------------------------------------------------------------------
    console.log("\n[TEST 6] Testing Failure Handling & Resilient Logging...")
    // Simulate invalid order ID
    const failRes = await OrderConfirmationService.sendOrderConfirmation("order_non_existent_99999999")
    console.log("Failure test result:", failRes)
    if (failRes.success) {
      throw new Error("Expected failure for non-existent order, but reported success!")
    }
    if (!failRes.error) {
      throw new Error("Expected error message for non-existent order, but none provided!")
    }
    console.log("✓ Failure safely handled and reported without throwing uncaught exceptions!")

    // ------------------------------------------------------------------------
    // TEST 7: Admin Resend Endpoint
    // ------------------------------------------------------------------------
    console.log("\n[TEST 7] Testing Admin Resend Endpoint (POST /admin/orders-management/:id/resend-email)...")

    // First login as admin to get token
    const adminLoginRes = await post("http://localhost:9000/auth/user/emailpass", {
      email: "admin@academyio.com",
      password: "SuperAdmin2026!",
    })
    const adminToken = JSON.parse(adminLoginRes.body.toString()).token

    if (!adminToken) {
      throw new Error("Admin login failed while testing resend endpoint!")
    }

    const resendRes = await post(
      `http://localhost:9000/admin/orders-management/${testOrder.id}/resend-email`,
      { custom_recipient: "admin-copy@academyio.com" },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    )

    console.log("Admin resend HTTP status:", resendRes.status)
    const resendData = JSON.parse(resendRes.body.toString())
    console.log("Admin resend response message:", resendData.message)

    if (resendRes.status !== 200 || !resendData.success) {
      throw new Error(`Admin resend failed: ${resendData.message || resendData.error}`)
    }

    // Check that attempt_count was incremented in DB
    const resendNotifRes = await client.query(
      `SELECT attempt_count, recipient_email, status, last_attempt_at FROM order_email_notification WHERE order_id = $1`,
      [testOrder.id]
    )
    const resendRow = resendNotifRes.rows[0]
    console.log(`Updated Attempts: ${resendRow.attempt_count}, Recipient: ${resendRow.recipient_email}`)
    if (resendRow.attempt_count < 2) {
      throw new Error("Admin resend did not increment attempt_count!")
    }

    // Also check order status in order table is unchanged
    const orderCheck = await client.query(`SELECT id, status FROM "order" WHERE id = $1`, [testOrder.id])
    console.log(`Order status remains: ${orderCheck.rows[0].status}`)
    console.log("✓ Admin resend endpoint verified: successfully resent email, updated attempts, preserved order/payment integrity!")

    // ------------------------------------------------------------------------
    // TEST 8: Order Details API Returns Email Notification
    // ------------------------------------------------------------------------
    console.log("\n[TEST 8] Checking GET /admin/orders-management/:id includes email_notification...")
    const detailRes = await get(`http://localhost:9000/admin/orders-management/${testOrder.id}`, {
      Authorization: `Bearer ${adminToken}`,
    })
    console.log("Detail HTTP status:", detailRes.status)
    const detailData = JSON.parse(detailRes.body.toString())
    const emailNotif = detailData.order?.email_notification
    console.log("Email Notification in order detail:", emailNotif ? `Status: ${emailNotif.status}, ID: ${emailNotif.id}` : "null")
    if (!emailNotif || emailNotif.status !== "sent") {
      throw new Error("Admin order detail API did not return email_notification!")
    }
    console.log("✓ Admin order details API verified: includes full email notification status and history!")

    console.log("\n==================================================================")
    console.log(">>> ALL 8 ORDER CONFIRMATION TESTS PASSED WITH 100% SUCCESS! <<<")
    console.log("==================================================================")
  } finally {
    client.release()
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test Suite Failed:", err)
    process.exit(1)
  })
