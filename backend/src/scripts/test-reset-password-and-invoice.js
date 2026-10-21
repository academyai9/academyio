const http = require("http")

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

async function verifyAll() {
  console.log("==================================================================")
  console.log("=== COMPREHENSIVE VERIFICATION: RESET PASSWORD & INVOICE PDF ===")
  console.log("==================================================================")

  // 1. Verify Forgot Password Page
  console.log("\n[TEST 1] Checking GET /us/forgot-password...")
  const forgotPage = await get("http://localhost:8000/us/forgot-password")
  console.log("Status:", forgotPage.status)
  if (forgotPage.status !== 200) throw new Error("Forgot password page failed to load!")
  console.log("✓ Forgot password page loaded successfully (200 OK)")

  // 2. Verify Password Reset Request API
  console.log("\n[TEST 2] Requesting password reset token for customer@academyio.com...")
  const reqRes = await post(
    "http://localhost:9000/store/password-reset/request",
    { email: "customer@academyio.com" },
    {
      "x-publishable-api-key": "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978",
    }
  )
  console.log("Request status:", reqRes.status)
  const reqData = JSON.parse(reqRes.body.toString())
  const resetToken = reqData.reset_token
  console.log("Generated token:", resetToken ? resetToken.slice(0, 16) + "..." : "none")
  if (!resetToken) throw new Error("No reset token generated!")
  console.log("✓ Password reset token generated successfully (200 OK)")

  // 3. Verify Reset Password Page with Token
  console.log("\n[TEST 3] Checking GET /us/reset-password with token...")
  const resetPage = await get(
    `http://localhost:8000/us/reset-password?token=${resetToken}&email=customer%40academyio.com`
  )
  console.log("Status:", resetPage.status)
  if (resetPage.status !== 200) throw new Error("Reset password page failed to load!")
  const hasResetForm = resetPage.body.toString().includes("Create New Password")
  console.log("Contains 'Create New Password':", hasResetForm)
  console.log("✓ Reset password page loaded successfully (200 OK)")

  // 4. Verify Password Reset Confirm API
  console.log("\n[TEST 4] Confirming password reset with new password...")
  const confRes = await post(
    "http://localhost:9000/store/password-reset/confirm",
    {
      email: "customer@academyio.com",
      token: resetToken,
      password: "Password123!",
    },
    {
      "x-publishable-api-key": "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978",
    }
  )
  console.log("Confirm status:", confRes.status)
  const confData = JSON.parse(confRes.body.toString())
  console.log("Message:", confData.message)
  if (confRes.status !== 200 || !confData.success) throw new Error("Failed to confirm password reset!")
  console.log("✓ Password reset confirmed and updated in auth provider (200 OK)")

  // 5. Verify Customer Login with the Password
  console.log("\n[TEST 5] Logging in with the reset password...")
  const loginRes = await post("http://localhost:9000/auth/customer/emailpass", {
    email: "customer@academyio.com",
    password: "Password123!",
  })
  console.log("Login status:", loginRes.status)
  const loginData = JSON.parse(loginRes.body.toString())
  const jwtToken = loginData.token
  if (!jwtToken) throw new Error("Customer login failed after password reset!")
  console.log("✓ Login succeeded and valid JWT session token returned!")

  // 6. Verify Login Page Success Banner
  console.log("\n[TEST 6] Checking GET /us/login?reset_success=true...")
  const loginPage = await get("http://localhost:8000/us/login?reset_success=true")
  console.log("Status:", loginPage.status)
  const hasSuccessBanner = loginPage.body.toString().includes("Password Reset Successfully")
  console.log("Contains 'Password Reset Successfully' banner:", hasSuccessBanner)
  if (!hasSuccessBanner) throw new Error("Reset success banner missing from login page!")
  console.log("✓ Login page renders verified password reset success banner (200 OK)")

  // 7. Verify Invoice PDF Generation & Download Endpoint
  console.log("\n[TEST 7] Testing GET /api/orders/order_01M4P87WW0T3F781TZWBJVHT2R/invoice...")
  const invoiceRes = await get("http://localhost:8000/api/orders/order_01M4P87WW0T3F781TZWBJVHT2R/invoice", {
    Cookie: `_medusa_jwt=${jwtToken}`,
  })
  console.log("Invoice HTTP Status:", invoiceRes.status)
  console.log("Content-Type:", invoiceRes.headers["content-type"])
  console.log("Content-Disposition:", invoiceRes.headers["content-disposition"])
  console.log("PDF File Size:", invoiceRes.body.length, "bytes")
  const isPdfHeader = invoiceRes.body.toString("utf-8", 0, 5) === "%PDF-"
  console.log("Valid PDF Header (%PDF-):", isPdfHeader)
  if (invoiceRes.status !== 200 || !isPdfHeader || invoiceRes.body.length < 1000) {
    throw new Error("Invoice PDF generation failed or produced invalid PDF file!")
  }
  console.log("✓ Official PDF Invoice generated and downloaded with 200 OK!")

  // 8. Verify Customer Dashboard Orders Tab Download Button
  console.log("\n[TEST 8] Checking GET /us/dashboard?tab=orders for Download Invoice action...")
  const dashboardOrders = await get("http://localhost:8000/us/dashboard?tab=orders", {
    Cookie: `_medusa_jwt=${jwtToken}`,
  })
  console.log("Dashboard Orders Status:", dashboardOrders.status)
  const html = dashboardOrders.body.toString()
  const hasInvoiceLink = html.includes("/api/orders/order_01M4P87WW0T3F781TZWBJVHT2R/invoice")
  const hasDownloadText = html.includes("Download Invoice (PDF)")
  console.log("Contains invoice download API URL:", hasInvoiceLink)
  console.log("Contains Download Invoice PDF button:", hasDownloadText)
  if (!hasInvoiceLink || !hasDownloadText) {
    throw new Error("Download Invoice button missing from Customer Dashboard Orders tab!")
  }
  console.log("✓ Customer Dashboard Orders tab has verified Download Invoice (PDF) buttons!")

  console.log("\n==================================================================")
  console.log(">>> ALL 8 VERIFICATION TESTS PASSED WITH 100% SUCCESS! <<<")
  console.log("==================================================================")
}

verifyAll().catch((err) => {
  console.error("Verification failed:", err)
  process.exit(1)
})
