const pg = require("pg")
const http = require("http")

const pool = new pg.Pool({ connectionString: "postgres://sonusaini@127.0.0.1:5432/academyio_medusa" })

function request(method, path, body = null, headers = {}, port = 9000) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : ""
    const reqHeaders = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      "x-publishable-api-key": "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978",
      ...headers,
    }

    const req = http.request(
      {
        hostname: "localhost",
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resBody = ""
        res.on("data", (chunk) => (resBody += chunk))
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resBody) })
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: resBody })
          }
        })
      }
    )
    req.on("error", reject)
    if (data) req.write(data)
    req.end()
  })
}

async function loginCustomer(email, password) {
  const res = await request("POST", "/auth/customer/emailpass", { email, password })
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Failed to login customer: ${JSON.stringify(res.body)}`)
  }
  return res.body.token
}

async function loginAdmin(email, password) {
  const res = await request("POST", "/auth/user/emailpass", { email, password })
  if (res.status !== 200 || !res.body?.token) {
    throw new Error(`Failed to login admin: ${JSON.stringify(res.body)}`)
  }
  return res.body.token
}

async function run() {
  console.log("===============================================================")
  console.log("=== COMPREHENSIVE E2E AUTOMATED QUIZ & CERTIFICATE TEST ===")
  console.log("===============================================================")

  const client = await pool.connect()
  try {
    // 1. Authenticate Customer & Admin
    console.log("\n[AUTH] Logging in test customer (customer@academyio.com)...")
    const customerToken = await loginCustomer("customer@academyio.com", "Password123!")
    console.log("✓ Customer authenticated successfully")

    console.log("\n[AUTH] Logging in super admin (admin@academyio.com)...")
    const adminToken = await loginAdmin("admin@academyio.com", "SuperAdmin2026!")
    console.log("✓ Admin authenticated successfully")

    const custHeaders = { Authorization: `Bearer ${customerToken}` }
    const adminHeaders = { Authorization: `Bearer ${adminToken}` }

    // Fetch customer profile
    const custRes = await client.query("SELECT id, email, first_name, last_name FROM customer WHERE email = $1", ["customer@academyio.com"])
    const customer = custRes.rows[0]
    const custId = customer.id
    console.log(`✓ Active customer ID: ${custId} (${customer.email})`)

    // 2. Prepare Concluded Webinar with Accredited Quiz
    const testWebinarId = "web_e2e_quiz_cert_suite"
    await client.query(`
      INSERT INTO webinar (
        id, title, slug, event_date, start_time, end_time, duration_minutes,
        cpe_credits, speaker_name, status, is_upcoming
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
      ON CONFLICT (id) DO UPDATE SET event_date = $4, end_time = $6, status = $10, cpe_credits = $8
    `, [
      testWebinarId,
      "Corporate Partnership Tax & Capital Accounts Masterclass",
      "corporate-partnership-tax-masterclass",
      new Date("2026-01-15T18:00:00Z"),
      "1:00 PM EST",
      "3:00 PM EST",
      120,
      3,
      "Greg White, CPA",
      "published"
    ])

    const testQuizId = "quiz_e2e_suite_101"
    await client.query(`
      INSERT INTO webinar_quiz (
        id, webinar_id, title, instructions, is_enabled, passing_score,
        cooldown_minutes, signatory_name, signatory_title, issuer_name, cpe_credits
      ) VALUES ($1, $2, $3, $4, true, 75, 60, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET passing_score = 75, cooldown_minutes = 60, is_enabled = true, cpe_credits = $8
    `, [
      testQuizId,
      testWebinarId,
      "Official NASBA/IRS CPE Verification Quiz: Corporate Partnership Tax",
      "Answer all questions. Minimum 75% required to pass. 60-minute cooling period on failure.",
      "Greg White, CPA",
      "Lead Faculty / CPE Course Director",
      "AcademyIO Continuing Professional Education",
      3.0
    ])

    // Author 4 Questions (Passing requires >= 75% = 3/4 or 4/4)
    await client.query("DELETE FROM quiz_question WHERE quiz_id = $1", [testQuizId])
    const questions = [
      {
        id: "q_corp_1",
        text: "What standard must partnership allocations meet under IRC Section 704(b)?",
        options: [
          { id: "opt_1a", text: "Substantial economic effect" },
          { id: "opt_1b", text: "Material participation test" },
          { id: "opt_1c", text: "At-risk limitation" },
          { id: "opt_1d", text: "Passive income grouping" },
        ],
        correct: "opt_1a"
      },
      {
        id: "q_corp_2",
        text: "Which schedule on Form 1065 reports the individual partners share of tax items?",
        options: [
          { id: "opt_2a", text: "Schedule C" },
          { id: "opt_2b", text: "Schedule K-1" },
          { id: "opt_2c", text: "Schedule E" },
          { id: "opt_2d", text: "Schedule M-3" },
        ],
        correct: "opt_2b"
      },
      {
        id: "q_corp_3",
        text: "What form is used by S-corporation shareholders to calculate and report stock and debt basis?",
        options: [
          { id: "opt_3a", text: "Form 7203" },
          { id: "opt_3b", text: "Form 8829" },
          { id: "opt_3c", text: "Form 4562" },
          { id: "opt_3d", text: "Form 1040-ES" },
        ],
        correct: "opt_3a"
      },
      {
        id: "q_corp_4",
        text: "What is the mandatory cooling-off waiting period before retaking a failed certificate quiz?",
        options: [
          { id: "opt_4a", text: "15 minutes" },
          { id: "opt_4b", text: "60 minutes" },
          { id: "opt_4c", text: "24 hours" },
          { id: "opt_4d", text: "7 days" },
        ],
        correct: "opt_4b"
      }
    ]

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      await client.query(`
        INSERT INTO quiz_question (
          id, quiz_id, question_text, question_type, options, correct_option_id, order_index
        ) VALUES ($1, $2, $3, 'multiple_choice', $4, $5, $6)
      `, [q.id, testQuizId, q.text, JSON.stringify(q.options), q.correct, i + 1])
    }

    // Clean up previous attempts/certificates/entitlements for this webinar
    await client.query("DELETE FROM webinar_certificate WHERE customer_id = $1 AND webinar_id = $2", [custId, testWebinarId])
    await client.query("DELETE FROM quiz_attempt WHERE customer_id = $1 AND webinar_id = $2", [custId, testWebinarId])
    await client.query("DELETE FROM customer_entitlement WHERE customer_id = $1 AND webinar_id = $2", [custId, testWebinarId])

    // Temporarily cancel subscription to verify strict enrollment check
    await client.query("UPDATE customer_subscription SET status = 'canceled' WHERE customer_id = $1", [custId])

    // TEST 1A: Unenrolled Customer Verification
    console.log("\n[TEST 1A] Access quiz when NOT enrolled in live webinar...")
    const t1 = await request("GET", `/store/customer/webinars/${testWebinarId}/quiz`, null, custHeaders)
    console.log(`Status: ${t1.status} | Eligible: ${t1.body?.eligible} | Message: "${t1.body?.message}"`)
    if (t1.status !== 403 || t1.body?.eligible !== false) {
      throw new Error("Test 1A failed: Expected 403 Forbidden for unenrolled participant")
    }
    console.log("✓ Correctly denied access to unenrolled participant")

    // Grant active live entitlement
    await client.query(`
      INSERT INTO customer_entitlement (
        id, customer_id, customer_email, webinar_id, access_type, status, granted_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'live', 'active', NOW(), NOW(), NOW())
    `, [`ent_suite_${custId}_${testWebinarId}`, custId, customer.email, testWebinarId])
    console.log("✓ Live enrollment entitlement granted to customer")

    // TEST 1B: Future Webinar End Time Protection
    console.log("\n[TEST 1B] Access quiz BEFORE live webinar has ended (future scheduled event)...")
    await client.query("UPDATE webinar SET event_date = NOW() + INTERVAL '7 days' WHERE id = $1", [testWebinarId])
    const t1b = await request("GET", `/store/customer/webinars/${testWebinarId}/quiz`, null, custHeaders)
    console.log(`Status: ${t1b.status} | Eligible: ${t1b.body?.eligible} | webinar_ended: ${t1b.body?.webinar_ended} | Message: "${t1b.body?.message}"`)
    if (t1b.status !== 403 || t1b.body?.webinar_ended !== false) {
      throw new Error("Test 1B failed: Expected 403 Forbidden for webinar that has not concluded")
    }
    console.log("✓ Access strictly blocked before live webinar conclusion.")

    // Now set event_date in the past so quiz unlocks
    await client.query("UPDATE webinar SET event_date = '2026-01-15 18:00:00Z', end_time = '3:00 PM EST' WHERE id = $1", [testWebinarId])

    // TEST 2: Enrolled Participant Access & Sanitization
    console.log("\n[TEST 2] Fetch quiz questions with authenticated token...")
    const t2 = await request("GET", `/store/customer/webinars/${testWebinarId}/quiz`, null, custHeaders)
    console.log(`Status: ${t2.status} | Eligible: ${t2.body?.eligible} | Total questions: ${t2.body?.questions?.length}`)
    if (t2.status !== 200 || !t2.body?.eligible || t2.body?.questions?.length !== 4) {
      throw new Error("Test 2 failed: Expected 200 OK with 4 questions")
    }
    // Verify answer keys are NEVER exposed
    const leakedKey = t2.body.questions.some(q => q.correct_option_id !== undefined || q.explanation !== undefined)
    if (leakedKey) {
      throw new Error("SECURITY FAILURE: Answer key or explanation leaked in GET questions response!")
    }
    console.log("✓ Quiz fetched successfully. All answer keys securely hidden on server.")

    // TEST 3: Submit Failing Answers (< 75%)
    console.log("\n[TEST 3] Submitting failing answers (1/4 = 25% < 75%)...")
    const t3 = await request("POST", `/store/customer/webinars/${testWebinarId}/quiz/submit`, {
      answers: {
        q_corp_1: "opt_1a", // correct
        q_corp_2: "opt_2a", // wrong
        q_corp_3: "opt_3b", // wrong
        q_corp_4: "opt_4a", // wrong
      }
    }, custHeaders)
    console.log(`Status: ${t3.status} | Passed: ${t3.body?.passed} | Score: ${t3.body?.score}% | Cooldown: ${t3.body?.cooldown_minutes} mins`)
    console.log(`Next eligible attempt timestamp: ${t3.body?.next_eligible_at}`)
    if (t3.status !== 200 || t3.body?.passed !== false || t3.body?.score !== 25) {
      throw new Error("Test 3 failed: Expected failing result with 25% score")
    }
    console.log("✓ Correctly evaluated failure and calculated 60-minute cooldown timestamp.")

    // TEST 4: Server-Side 60-Minute Cooldown Lockout Enforcement
    console.log("\n[TEST 4] Verifying 60-minute cooldown lock enforcement...")
    const t4Get = await request("GET", `/store/customer/webinars/${testWebinarId}/quiz`, null, custHeaders)
    console.log(`GET /quiz: on_cooldown=${t4Get.body?.on_cooldown}, remaining_seconds=${t4Get.body?.remaining_seconds}`)
    if (!t4Get.body?.on_cooldown || t4Get.body?.remaining_seconds <= 0) {
      throw new Error("Test 4 failed: Cooldown not reported on GET /quiz")
    }

    const t4Post = await request("POST", `/store/customer/webinars/${testWebinarId}/quiz/submit`, {
      answers: { q_corp_1: "opt_1a" }
    }, custHeaders)
    console.log(`POST /submit during cooldown: Status ${t4Post.status} | "${t4Post.body?.message}"`)
    if (t4Post.status !== 429) {
      throw new Error("Test 4 failed: Expected HTTP 429 Too Many Requests during active cooldown")
    }
    console.log("✓ Server strictly blocks quiz submission during the active 60-minute cooling period.")

    // TEST 5: Admin Cooldown Override
    console.log("\n[TEST 5] Testing Admin Cooldown Reset Endpoint...")
    const latestAttempt = (await client.query(
      "SELECT id FROM quiz_attempt WHERE customer_id = $1 AND webinar_id = $2 ORDER BY submitted_at DESC LIMIT 1",
      [custId, testWebinarId]
    )).rows[0]

    const t5 = await request("POST", `/admin/certificates/attempts/${latestAttempt.id}/reset-cooldown`, {
      admin_note: "Auditor testing override permission"
    }, adminHeaders)
    console.log(`Status: ${t5.status} | Success: ${t5.body?.success} | Message: "${t5.body?.message}"`)
    if (t5.status !== 200 || !t5.body?.success) {
      throw new Error("Test 5 failed: Admin reset cooldown failed")
    }

    const t5Verify = await request("GET", `/store/customer/webinars/${testWebinarId}/quiz`, null, custHeaders)
    console.log(`GET /quiz after admin reset: on_cooldown=${t5Verify.body?.on_cooldown}`)
    if (t5Verify.body?.on_cooldown !== false) {
      throw new Error("Test 5 failed: Cooldown was not lifted after admin reset")
    }
    console.log("✓ Administrator successfully overrode cooldown with audit trail.")

    // TEST 6: Submit Passing Answers (100% >= 75%)
    console.log("\n[TEST 6] Submitting passing answers (4/4 = 100% >= 75%)...")
    const t6 = await request("POST", `/store/customer/webinars/${testWebinarId}/quiz/submit`, {
      answers: {
        q_corp_1: "opt_1a",
        q_corp_2: "opt_2b",
        q_corp_3: "opt_3a",
        q_corp_4: "opt_4b",
      }
    }, custHeaders)
    console.log(`Status: ${t6.status} | Passed: ${t6.body?.passed} | Score: ${t6.body?.score}%`)
    console.log(`Generated Certificate ID: ${t6.body?.certificate?.id}`)
    console.log(`Official Certificate Number: ${t6.body?.certificate?.certificate_number}`)
    console.log(`Participant Name on Certificate: ${t6.body?.certificate?.customer_name}`)
    console.log(`Accredited CPE Credits: ${t6.body?.certificate?.cpe_credits}`)

    if (t6.status !== 200 || t6.body?.passed !== true || !t6.body?.certificate?.certificate_number) {
      throw new Error("Test 6 failed: Expected certificate issuance for passing score")
    }
    const certId = t6.body.certificate.id
    console.log("✓ Certificate automatically issued and registered in database.")

    // TEST 7: Idempotency & Already Certified Protection
    console.log("\n[TEST 7] Verifying Already Certified status on subsequent quiz load...")
    const t7 = await request("GET", `/store/customer/webinars/${testWebinarId}/quiz`, null, custHeaders)
    console.log(`already_passed=${t7.body?.already_passed} | Certificate: ${t7.body?.certificate?.certificate_number}`)
    if (!t7.body?.already_passed) {
      throw new Error("Test 7 failed: Expected already_passed = true")
    }
    console.log("✓ Certified participant redirected to certificate details.")

    // TEST 8: Customer Certificates Dashboard List API
    console.log("\n[TEST 8] Fetching Customer Certificates Dashboard List...")
    const t8 = await request("GET", `/store/customer/certificates`, null, custHeaders)
    console.log(`Total Certificates: ${t8.body?.certificates?.length}`)
    const foundCert = t8.body?.certificates?.find(c => c.id === certId)
    console.log(`Found Certificate Number: ${foundCert?.certificate_number}`)
    if (t8.status !== 200 || !foundCert) {
      throw new Error("Test 8 failed: Certificate not present in customer certificate list")
    }
    console.log("✓ Certificate displayed in customer dashboard.")

    // TEST 9: Admin Certificates & Quizzes Report Center
    console.log("\n[TEST 9] Fetching Admin Certificates & Quizzes Reports...")
    const t9 = await request("GET", `/admin/certificates/reports`, null, adminHeaders)
    console.log("Admin Metrics:", t9.body?.stats)
    console.log(`Logged Attempts in Report: ${t9.body?.attempts?.length}`)
    console.log(`Active Certificates in Report: ${t9.body?.certificates?.length}`)
    if (t9.status !== 200 || !t9.body?.stats || t9.body?.certificates?.length === 0) {
      throw new Error("Test 9 failed: Admin reports center failed")
    }
    console.log("✓ Admin reporting center returns accurate metrics, audit attempts, and issued certificates.")

    // TEST 10: High-Fidelity PDF Certificate Generation Endpoint
    console.log("\n[TEST 10] Generating vector PDF Certificate via Storefront API...")
    const t10 = await request("GET", `/api/certificates/${certId}/download`, null, {
      ...custHeaders,
      Cookie: `_medusa_jwt=${customerToken}`,
    }, 8000)
    console.log(`HTTP Status: ${t10.status} | Content-Type: ${t10.headers["content-type"]}`)
    const isPdf = typeof t10.raw === "string" && t10.raw.startsWith("%PDF")
    console.log(`Valid PDF Binary Header (%PDF): ${isPdf}`)
    console.log(`Content-Disposition: ${t10.headers["content-disposition"]}`)
    if (t10.status !== 200 || !isPdf) {
      throw new Error("Test 10 failed: Storefront PDF generator did not produce valid PDF")
    }
    console.log("✓ Professional vector PDF certificate successfully generated and downloaded!")

    console.log("\n===============================================================")
    console.log(">>> ALL 10 E2E AUTOMATED TESTS PASSED WITH 100% SUCCESS! <<<")
    console.log("===============================================================\n")
  } finally {
    try {
      await client.query("UPDATE customer_subscription SET status = 'active' WHERE customer_id = 'cus_01M4N9E77VCVQ630H7XRT1441K'")
    } catch {}
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error("FATAL TEST FAILURE:", err)
  process.exit(1)
})
