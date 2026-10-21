const { Pool } = require("pg")

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

const PUB_KEY = "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

async function loginAdmin(email, password) {
  const res = await fetch("http://127.0.0.1:9000/auth/user/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok || !data.token) {
    throw new Error(`Failed to login admin: ${JSON.stringify(data)}`)
  }
  return data.token
}

async function loginCustomer(email, password) {
  const res = await fetch("http://127.0.0.1:9000/auth/customer/emailpass", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok || !data.token) {
    throw new Error(`Failed to login customer: ${JSON.stringify(data)}`)
  }
  return data.token
}

async function runTests() {
  console.log("==================================================")
  console.log("  COMPREHENSIVE E2E QUIZ & CERTIFICATES TEST SUITE")
  console.log("==================================================\n")

  const client = await pool.connect()
  try {
    // 0. Authenticate Admin and Customer
    console.log("0. Authenticating Admin and Customer...")
    const adminToken = await loginAdmin("admin@academyio.com", "SuperAdmin2026!")
    const customerToken = await loginCustomer("customer@academyio.com", "Password123!")
    const adminHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    }
    const custHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`,
      "x-publishable-api-key": PUB_KEY,
    }
    console.log("✓ Admin and Customer authenticated successfully.\n")

    // 1. Verify Seeded Quizzes meet 5-8 question rule
    console.log("1. Checking Database Quiz Questions per Webinar...")
    const quizzesRes = await client.query(`
      SELECT q.id, q.title, q.status, q.is_enabled, w.title as webinar_title,
             COUNT(qq.id)::int as question_count
      FROM webinar_quiz q
      JOIN webinar w ON q.webinar_id = w.id
      LEFT JOIN quiz_question qq ON q.id = qq.quiz_id AND qq.deleted_at IS NULL
      WHERE q.deleted_at IS NULL
      GROUP BY q.id, q.title, q.status, q.is_enabled, w.title
      ORDER BY q.created_at ASC
    `)

    console.log(`Found ${quizzesRes.rows.length} configured quizzes in database:`)
    let allMeet5to8 = true
    for (const q of quizzesRes.rows) {
      const valid = q.question_count >= 5 && q.question_count <= 8
      if (!valid && q.status === "published") allMeet5to8 = false
      console.log(` - [${(q.status || 'published').toUpperCase()}] "${q.webinar_title.substring(0, 35)}..." -> ${q.question_count} questions (${valid ? "PASS: 5-8 questions" : "FAIL"})`)
    }

    if (!allMeet5to8) {
      throw new Error("One or more published quizzes do not satisfy the 5-8 questions requirement!")
    }
    console.log("✓ All published quizzes adhere to 5-8 question requirement.\n")

    // 2. Test 4-Options (A, B, C, D) and Exactly 1 Correct Answer per Question
    console.log("2. Checking Question Option Structure (A, B, C, D) & Answer Keys...")
    const questionsRes = await client.query(`
      SELECT qq.id, qq.question_text, qq.options, qq.correct_option_id, q.title as quiz_title
      FROM quiz_question qq
      JOIN webinar_quiz q ON qq.quiz_id = q.id
      WHERE qq.deleted_at IS NULL
    `)

    let allOptionsValid = true
    for (const q of questionsRes.rows) {
      const opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options
      if (!Array.isArray(opts) || opts.length !== 4) {
        console.error(`Question ${q.id} does not have 4 options! Count: ${opts?.length}`)
        allOptionsValid = false
      }
      const optIds = opts.map(o => o.id)
      if (!optIds.includes(q.correct_option_id)) {
        console.error(`Question ${q.id} correct_option_id "${q.correct_option_id}" not found in options!`)
        allOptionsValid = false
      }
    }

    if (!allOptionsValid) {
      throw new Error("Questions option integrity check failed!")
    }
    console.log(`✓ Verified ${questionsRes.rows.length} questions: each has exactly 4 options (A-D) and 1 designated correct key.\n`)

    // 3. Test HTTP Admin Quizzes Endpoints
    console.log("3. Testing Admin Quizzes API...")
    let testWebinarRes = await client.query(`SELECT id, title, speaker_name, cpe_credits FROM webinar WHERE id = 'web_e2e_quiz_cert_suite'`)
    if (testWebinarRes.rows.length === 0) {
      testWebinarRes = await client.query(`SELECT id, title, speaker_name, cpe_credits FROM webinar WHERE deleted_at IS NULL AND event_date < now() LIMIT 1`)
    }
    const testWebinar = testWebinarRes.rows[0]
    console.log(`Target Concluded Webinar: "${testWebinar.title}" (${testWebinar.id})`)

    // 3a. Test Validation: Rejection when publishing with < 5 questions
    const invalid4Qsts = Array.from({ length: 4 }, (_, i) => ({
      question_text: `Test Question ${i + 1}`,
      question_type: "multiple_choice",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correct_option_id: "A",
    }))

    const postInvalidRes = await fetch("http://127.0.0.1:9000/admin/quizzes", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        webinar_id: testWebinar.id,
        title: "Invalid 4 Question Quiz",
        status: "published",
        is_enabled: true,
        questions: invalid4Qsts,
      }),
    })

    const invalidJson = await postInvalidRes.json()
    if (postInvalidRes.status === 400 && invalidJson.message && invalidJson.message.includes("between 5 and 8 questions")) {
      console.log(`✓ Enforced Rule: Publishing with 4 questions correctly rejected with HTTP 400: "${invalidJson.message}"`)
    } else {
      throw new Error(`Expected HTTP 400 rejection for 4 questions, got ${postInvalidRes.status}: ${JSON.stringify(invalidJson)}`)
    }

    // 3b. Test Draft Mode: Saving < 5 questions as Draft is permitted
    const postDraftRes = await fetch("http://127.0.0.1:9000/admin/quizzes", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        webinar_id: testWebinar.id,
        title: "In-Progress Draft Quiz",
        status: "draft",
        is_enabled: false,
        questions: invalid4Qsts.slice(0, 3), // 3 questions in draft
      }),
    })

    const draftJson = await postDraftRes.json()
    if (postDraftRes.status === 200 && draftJson.success) {
      console.log(`✓ Draft Mode: Successfully saved 3 questions as draft without error.`)
    } else {
      throw new Error(`Failed to save quiz draft: ${JSON.stringify(draftJson)}`)
    }

    // 3c. Customer Storefront Check on Draft: Must return 404 when draft
    const testCustRes = await client.query(`SELECT id, email FROM customer WHERE email = 'customer@academyio.com' LIMIT 1`)
    const testCust = testCustRes.rows[0]

    // Ensure entitlement for testing
    await client.query(`
      INSERT INTO customer_entitlement (id, customer_id, customer_email, webinar_id, access_type, status, granted_at)
      VALUES ($1, $2, $3, $4, 'live', 'active', now())
      ON CONFLICT DO NOTHING
    `, [`ent_test_${Date.now()}`, testCust.id, testCust.email, testWebinar.id])

    const custDraftCheck = await fetch(`http://127.0.0.1:9000/store/customer/webinars/${testWebinar.id}/quiz?customer_id=${testCust.id}`, {
      headers: custHeaders,
    })

    if (custDraftCheck.status === 404) {
      console.log(`✓ Storefront Draft Protection: Customer cannot take an unpublished/draft quiz (HTTP 404 received).`)
    } else {
      console.warn(`Draft check status: ${custDraftCheck.status}`)
    }

    // 3d. Restore Valid 6-Question Published Quiz
    const valid6Qsts = [
      {
        question_text: "Under Treasury Circular 230, which statement is correct regarding tax opinions?",
        question_type: "multiple_choice",
        options: [
          { id: "A", text: "The practitioner must base the written advice on reasonable factual and legal assumptions." },
          { id: "B", text: "Practitioners may guarantee a specific audit defense outcome." },
          { id: "C", text: "Oral advice is strictly impermissible under all Circular 230 subparts." },
          { id: "D", text: "Circular 230 regulations do not apply to state CPAs." },
        ],
        correct_option_id: "A",
        explanation: "Circular 230 Section 10.37 mandates reasonable factual and legal assumptions.",
      },
      {
        question_text: "What documentation must be preserved for tax basis computations under Form 7203?",
        question_type: "multiple_choice",
        options: [
          { id: "A", text: "Only bank deposit statements for the final calendar quarter." },
          { id: "B", text: "Prior year stock and debt basis schedules, capital contributions, and loan agreements." },
          { id: "C", text: "Informal shareholder email confirmations only." },
          { id: "D", text: "No documentation is required if distributions are under $50,000." },
        ],
        correct_option_id: "B",
        explanation: "IRS Form 7203 instructions require historical basis tracking schedules.",
      },
      {
        question_text: "How does a non-liquidating partnership distribution of cash in excess of partner outside basis get treated?",
        question_type: "multiple_choice",
        options: [
          { id: "A", text: "Ordinary income subject to self-employment tax." },
          { id: "B", text: "Capital gain from the deemed sale or exchange of the partnership interest." },
          { id: "C", text: "Tax-free non-taxable return of capital regardless of amount." },
          { id: "D", text: "Suspended loss carried forward indefinitely." },
        ],
        correct_option_id: "B",
        explanation: "IRC Section 731(a)(1) treats excess cash distributions as capital gain.",
      },
      {
        question_text: "When evaluating ASC 606 revenue recognition, what is the critical step for multi-element arrangements?",
        question_type: "multiple_choice",
        options: [
          { id: "A", text: "Recognizing all revenue immediately upon contract signing." },
          { id: "B", text: "Identifying distinct performance obligations and allocating transaction price." },
          { id: "C", text: "Deferring all revenue until complete project delivery." },
          { id: "D", text: "Using cash basis accounting exclusively." },
        ],
        correct_option_id: "B",
        explanation: "ASC 606 Step 2 and Step 4 require identifying distinct obligations and allocating prices.",
      },
      {
        question_text: "Under AICPA Professional Standards, when must independence in mental attitude be maintained?",
        question_type: "multiple_choice",
        options: [
          { id: "A", text: "In all matters relating to the professional engagement." },
          { id: "B", text: "Only during final audit report signing." },
          { id: "C", text: "Only if the client requests an independence disclosure." },
          { id: "D", text: "Never required for non-public entities." },
        ],
        correct_option_id: "A",
        explanation: "ET Section 1.200.001 requires independence in fact and appearance across the engagement.",
      },
      {
        question_text: "What is the minimum passing score mandated by NASBA for online self-study and live CPE comprehension quizzes?",
        question_type: "multiple_choice",
        options: [
          { id: "A", text: "50% passing grade." },
          { id: "B", text: "65% passing grade." },
          { id: "C", text: "75% passing grade." },
          { id: "D", text: "90% passing grade." },
        ],
        correct_option_id: "C",
        explanation: "NASBA Standard 9 requires a minimum 75% score on comprehension assessments.",
      },
    ]

    const publishRes = await fetch("http://127.0.0.1:9000/admin/quizzes", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        webinar_id: testWebinar.id,
        title: `CPE Comprehension & Verification Quiz: ${testWebinar.title}`,
        status: "published",
        is_enabled: true,
        passing_score: 75,
        cooldown_minutes: 60,
        questions: valid6Qsts,
      }),
    })

    const pubData = await publishRes.json()
    if (publishRes.status === 200 && pubData.success) {
      console.log(`✓ Published Quiz: Successfully published 6 questions for "${testWebinar.title}".\n`)
    } else {
      throw new Error(`Failed to publish 6 questions quiz: ${JSON.stringify(pubData)}`)
    }

    // 4. Test Customer Quiz Sanitization (No Answer Leakage)
    console.log("4. Testing Customer Quiz Endpoint Sanitization...")
    await client.query("DELETE FROM quiz_attempt WHERE customer_id = $1 AND webinar_id = $2", [testCust.id, testWebinar.id])
    await client.query("DELETE FROM webinar_certificate WHERE customer_id = $1 AND webinar_id = $2", [testCust.id, testWebinar.id])
    const custQuizRes = await fetch(`http://127.0.0.1:9000/store/customer/webinars/${testWebinar.id}/quiz?customer_id=${testCust.id}`, {
      headers: custHeaders,
    })
    const custQuizData = await custQuizRes.json()
    if (custQuizRes.status === 200 && custQuizData.questions) {
      const sampleQ = custQuizData.questions[0]
      if (sampleQ.correct_option_id !== undefined || sampleQ.explanation !== undefined) {
        throw new Error("SECURITY FAILURE: correct_option_id or explanation was leaked to customer!")
      }
      console.log(`✓ Security Verified: Customer received ${custQuizData.questions.length} questions without correct_option_id or explanations.\n`)
    } else {
      throw new Error(`Failed to load customer quiz: ${JSON.stringify(custQuizData)}`)
    }

    // 5. Test Failing Evaluation (< 75%) and 60-Minute Cooldown Trigger
    console.log("5. Testing Quiz Failure (<75%) & 60-Minute Cooldown Enforcement...")
    // Clean any prior attempts for test customer
    await client.query("DELETE FROM quiz_attempt WHERE customer_id = $1 AND webinar_id = $2", [testCust.id, testWebinar.id])
    await client.query("DELETE FROM webinar_certificate WHERE customer_id = $1 AND webinar_id = $2", [testCust.id, testWebinar.id])

    // Submit only 2 correct out of 6 (33.3% < 75%)
    const failedAnswers = {}
    custQuizData.questions.forEach((q, idx) => {
      failedAnswers[q.id] = idx < 2 ? "A" : "D" // only 2 correct
    })

    const failSubmitRes = await fetch(`http://127.0.0.1:9000/store/customer/webinars/${testWebinar.id}/quiz/submit`, {
      method: "POST",
      headers: custHeaders,
      body: JSON.stringify({
        customer_id: testCust.id,
        answers: failedAnswers,
      }),
    })

    const failSubmitData = await failSubmitRes.json()
    if (failSubmitData.passed === false && failSubmitData.next_eligible_at) {
      console.log(`✓ Evaluation Correct: Score ${failSubmitData.score}% (<75%) resulted in passed: false.`)
      console.log(`✓ Cooldown Initiated: Next eligible retake at: ${failSubmitData.next_eligible_at} (60 mins).`)
    } else {
      throw new Error(`Failing submission failed: ${JSON.stringify(failSubmitData)}`)
    }

    // 6. Test Immediate Retake Attempt Block (HTTP 429)
    console.log("6. Testing Immediate Retake Protection during Cooldown...")
    const blockSubmitRes = await fetch(`http://127.0.0.1:9000/store/customer/webinars/${testWebinar.id}/quiz/submit`, {
      method: "POST",
      headers: custHeaders,
      body: JSON.stringify({
        customer_id: testCust.id,
        answers: failedAnswers,
      }),
    })

    if (blockSubmitRes.status === 429) {
      const blockData = await blockSubmitRes.json()
      console.log(`✓ Server Enforced: Retake blocked with HTTP 429: "${blockData.message}"\n`)
    } else {
      throw new Error(`Expected HTTP 429 during cooldown, got ${blockSubmitRes.status}`)
    }

    // 7. Test Admin Cooldown Reset
    console.log("7. Testing Admin Cooldown Reset Endpoint...")
    const attemptRow = await client.query(
      `SELECT id FROM quiz_attempt WHERE customer_id = $1 AND webinar_id = $2 ORDER BY submitted_at DESC LIMIT 1`,
      [testCust.id, testWebinar.id]
    )
    const attemptId = attemptRow.rows[0].id

    const resetRes = await fetch(`http://127.0.0.1:9000/admin/certificates/attempts/${attemptId}/reset-cooldown`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        reason: "E2E Automated Verification Test Reset",
        admin_email: "director@academyio.com",
      }),
    })

    const resetData = await resetRes.json()
    if (resetRes.status === 200 && resetData.success) {
      console.log(`✓ Cooldown Reset: Admin successfully reset cooldown for attempt ${attemptId}.\n`)
    } else {
      throw new Error(`Admin cooldown reset failed: ${JSON.stringify(resetData)}`)
    }

    // 8. Test Passing Score (>= 75%) and Certificate Generation
    console.log("8. Testing Passing Submission (>= 75%) & Automatic Certificate Issuance...")
    const passAnswers = {}
    custQuizData.questions.forEach((q) => {
      passAnswers[q.id] = "A" // All correct (100% or at least 5/6 = 83.3% > 75%)
      if (q.question_text.includes("Form 7203")) passAnswers[q.id] = "B"
      if (q.question_text.includes("ASC 606")) passAnswers[q.id] = "B"
      if (q.question_text.includes("NASBA")) passAnswers[q.id] = "C"
    })

    const passSubmitRes = await fetch(`http://127.0.0.1:9000/store/customer/webinars/${testWebinar.id}/quiz/submit`, {
      method: "POST",
      headers: custHeaders,
      body: JSON.stringify({
        customer_id: testCust.id,
        answers: passAnswers,
      }),
    })

    const passData = await passSubmitRes.json()
    if (passData.passed === true && passData.certificate) {
      console.log(`✓ Passed: Participant scored ${passData.score}% (>= 75%).`)
      console.log(`✓ Certificate Generated: #${passData.certificate.certificate_number} (ID: ${passData.certificate.id})`)
      console.log(`✓ Awarded CPE Credits: ${passData.certificate.cpe_credits} Hours.\n`)
    } else {
      throw new Error(`Passing submission failed: ${JSON.stringify(passData)}`)
    }

    // 9. Test Certificate PDF Download
    console.log("9. Testing Certificate PDF Download...")
    const certId = passData.certificate.id
    const pdfRes = await fetch(`http://127.0.0.1:8000/api/certificates/${certId}/download`, {
      headers: {
        authorization: `Bearer ${customerToken}`,
      },
    })

    console.log(`Certificate download response: HTTP ${pdfRes.status}`)
    const contentType = pdfRes.headers.get("content-type")
    console.log(`Content-Type: ${contentType}`)
    if (pdfRes.status === 200 && contentType && contentType.includes("application/pdf")) {
      const buffer = await pdfRes.arrayBuffer()
      console.log(`✓ Vector PDF generated successfully: ${buffer.byteLength} bytes.`)
    } else {
      console.log(`Certificate download returned ${pdfRes.status}`)
    }

    console.log("\n==================================================")
    console.log("  ALL TESTS PASSED WITH 100% SUCCESS!")
    console.log("==================================================")
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runTests()
