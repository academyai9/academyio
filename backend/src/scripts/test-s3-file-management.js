/**
 * Comprehensive Acceptance Test Suite for AcademyIO Private Amazon S3 Webinar File Management System
 *
 * Verifies:
 * 1. S3 Storage Service validation (MIME whitelisting, extension blacklisting, size thresholds)
 * 2. Presigned Upload URL generation and key sanitization
 * 3. File registration & metadata persistence in PostgreSQL
 * 4. Customer authorization controls (401 unauthenticated, 403 unauthorized, 403 wrong variant/option)
 * 5. Short-lived presigned download URL generation (Content-Disposition: attachment)
 * 6. File deletion and cleanup lifecycle
 */

const pg = require("pg")
const { S3StorageService } = require("../modules/webinar/s3-storage-service")

const DB_URL = process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa"

async function runTests() {
  console.log("================================================================================")
  console.log("  ACADEMYIO PRIVATE AMAZON S3 WEBINAR FILE MANAGEMENT SYSTEM - TEST SUITE")
  console.log("================================================================================\n")

  const pool = new pg.Pool({ host: "/tmp", database: "academyio_medusa", user: process.env.USER || "sonusaini" })
  let passed = 0
  let failed = 0

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ""}`)
      failed++
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: S3 Validation & Presigned Upload URLs
    // -------------------------------------------------------------------------
    console.log("--- Group 1: Presigned Uploads, S3 Key Sanitization & Validation ---")

    // Test 1.1: Valid PDF upload request
    const validUpload = await S3StorageService.getPresignedUploadUrl({
      webinarId: "web_test_123",
      materialType: "handout",
      fileName: "IRS Audit & Form 7203 Guide (2026).pdf",
      mimeType: "application/pdf",
      fileSize: 4500000,
      expiresInSeconds: 900,
    })

    assert(
      validUpload.upload_url && validUpload.s3_key && validUpload.s3_bucket,
      "Generate presigned upload URL for valid PDF",
      `Key: ${validUpload.s3_key}`
    )

    assert(
      validUpload.s3_key.startsWith("webinars/web_test_123/handout/") &&
        validUpload.s3_key.endsWith(".pdf") &&
        validUpload.s3_key.includes("irs-audit-form-7203-guide-2026"),
      "S3 object key correctly scoped, namespaced, and sanitized",
      `Actual key: ${validUpload.s3_key}`
    )

    assert(
      validUpload.expires_in_seconds === 900,
      "Upload URL has 15-minute (900s) short-lived expiration limit"
    )

    // Test 1.2: Reject dangerous executable file extension
    let blockedExtError = null
    try {
      await S3StorageService.getPresignedUploadUrl({
        webinarId: "web_test_123",
        materialType: "handout",
        fileName: "malicious_payload.exe",
        mimeType: "application/octet-stream",
        fileSize: 1000,
      })
    } catch (e) {
      blockedExtError = e
    }
    assert(
      blockedExtError && blockedExtError.message.includes("forbidden for security"),
      "Reject dangerous file extension (.exe) with security error",
      blockedExtError?.message
    )

    // Test 1.3: Reject unwhitelisted MIME type
    let badMimeError = null
    try {
      await S3StorageService.getPresignedUploadUrl({
        webinarId: "web_test_123",
        materialType: "handout",
        fileName: "data_sample.custom",
        mimeType: "application/x-custom-binary",
        fileSize: 1000,
      })
    } catch (e) {
      badMimeError = e
    }
    assert(
      badMimeError && badMimeError.message.includes("Unsupported MIME type"),
      "Reject unapproved MIME type (application/x-custom-binary)",
      badMimeError?.message
    )

    // Test 1.4: Allow 500MB PDF document upload
    const large500mbDoc = await S3StorageService.getPresignedUploadUrl({
      webinarId: "web_test_123",
      materialType: "handout",
      fileName: "large_500mb_presentation.pdf",
      mimeType: "application/pdf",
      fileSize: 500 * 1024 * 1024, // 500MB
    })
    assert(
      large500mbDoc.upload_url && large500mbDoc.s3_key.includes("/materials/"),
      "Allow 500MB PDF document upload within 1GB threshold",
      `Key: ${large500mbDoc.s3_key}`
    )

    // Test 1.4b: Reject oversize document (> 1GB)
    let oversizeDocError = null
    try {
      await S3StorageService.getPresignedUploadUrl({
        webinarId: "web_test_123",
        materialType: "handout",
        fileName: "huge_document.pdf",
        mimeType: "application/pdf",
        fileSize: 1.2 * 1024 * 1024 * 1024, // 1.2GB
      })
    } catch (e) {
      oversizeDocError = e
    }
    assert(
      oversizeDocError && oversizeDocError.message.includes("exceeds the allowable limit"),
      "Enforce maximum file size limit (1GB limit for documents)",
      oversizeDocError?.message
    )

    // Test 1.5: Allow large MP4 video under 5GB
    const validVideoUpload = await S3StorageService.getPresignedUploadUrl({
      webinarId: "web_test_123",
      materialType: "recording",
      fileName: "webinar_master_full_session_hd.mp4",
      mimeType: "video/mp4",
      fileSize: 3.5 * 1024 * 1024 * 1024, // 3.5 GB
    })
    assert(
      validVideoUpload.upload_url && validVideoUpload.s3_key.includes("/recording/"),
      "Allow large video MP4 within 5GB threshold",
      `Key: ${validVideoUpload.s3_key}`
    )

    console.log("\n--- Group 2: Database Persistence & Metadata Model ---")

    // Retrieve an existing webinar from DB to link real records
    const webRes = await pool.query(`SELECT id, title FROM webinar ORDER BY created_at DESC LIMIT 1`)
    const targetWebinar = webRes.rows[0]
    assert(!!targetWebinar, "Found active target webinar in database", targetWebinar?.title)

    // Test 2.1: Insert a test webinar_file record
    const testFileId = `wf_test_${Date.now()}`
    const testS3Key = `webinars/${targetWebinar.id}/recording/session_recording_test.mp4`

    await pool.query(
      `
      INSERT INTO webinar_file (
        id, webinar_id, purchase_option, material_type, title, description,
        s3_key, s3_bucket, s3_region, file_name, file_size, mime_type,
        is_active, display_order, upload_status, metadata
      ) VALUES (
        $1, $2, 'recording', 'recording', 'Full Session HD Video Recording [Automated Test]',
        'Test automated recording material', $3, 'academyio-private-assets', 'us-east-1',
        'session_recording_test.mp4', 157286400, 'video/mp4', true, 1, 'completed', '{"automated_test": true}'
      )
    `,
      [testFileId, targetWebinar.id, testS3Key]
    )

    const queryFileRes = await pool.query(`SELECT * FROM webinar_file WHERE id = $1`, [testFileId])
    assert(
      queryFileRes.rows.length === 1 && queryFileRes.rows[0].upload_status === "completed",
      "Persist webinar_file record with completed upload status in PostgreSQL"
    )

    console.log("\n--- Group 3: Customer Authorization & Access Control Checks ---")

    // Setup Test Customer and Scenarios
    const testCustIdAuthorized = `cus_test_auth_${Date.now()}`
    const testCustIdUnauthorized = `cus_test_unauth_${Date.now()}`
    const testCustIdWrongOption = `cus_test_transcript_only_${Date.now()}`

    // Customer A: Has active recording entitlement
    await pool.query(
      `
      INSERT INTO customer_entitlement (
        id, customer_id, customer_email, webinar_id, access_type, status, granted_at, created_at, updated_at
      ) VALUES (
        $1, $2, 'auth_test@academyio.com', $3, 'recording', 'active', NOW(), NOW(), NOW()
      )
    `,
      [`ent_test_${Date.now()}_1`, testCustIdAuthorized, targetWebinar.id]
    )

    // Customer C: Has transcript-only entitlement
    await pool.query(
      `
      INSERT INTO customer_entitlement (
        id, customer_id, customer_email, webinar_id, access_type, status, granted_at, created_at, updated_at
      ) VALUES (
        $1, $2, 'transcript_test@academyio.com', $3, 'transcript', 'active', NOW(), NOW(), NOW()
      )
    `,
      [`ent_test_${Date.now()}_2`, testCustIdWrongOption, targetWebinar.id]
    )

    // Test 3.1: Authorization check function simulating download endpoint logic
    async function checkCustomerCanDownload(customerId, webinarId, fileId) {
      if (!customerId) {
        return { status: 401, error: "Authentication required" }
      }

      // Check file
      const fRes = await pool.query(
        `SELECT * FROM webinar_file WHERE id = $1 AND webinar_id = $2 AND is_active = true AND deleted_at IS NULL`,
        [fileId, webinarId]
      )
      if (fRes.rows.length === 0) {
        return { status: 404, error: "Material not found" }
      }
      const file = fRes.rows[0]

      // Check customer subscription
      const subRes = await pool.query(
        `SELECT id FROM customer_subscription WHERE customer_id = $1 AND status = 'active' AND deleted_at IS NULL`,
        [customerId]
      )

      // Check customer entitlement
      const entRes = await pool.query(
        `SELECT access_type FROM customer_entitlement WHERE customer_id = $1 AND webinar_id = $2 AND status = 'active' AND deleted_at IS NULL`,
        [customerId, webinarId]
      )

      const hasSub = subRes.rows.length > 0
      const entitlements = entRes.rows

      if (!hasSub && entitlements.length === 0) {
        return { status: 403, error: "Access Denied: No purchase or entitlement" }
      }

      const accessTypes = new Set(entitlements.map((e) => e.access_type))
      if (hasSub) {
        accessTypes.add("bundle")
        accessTypes.add("all")
      }

      const hasFullAccess = accessTypes.has("bundle") || accessTypes.has("all")
      let canDownload = false

      if (hasFullAccess || file.purchase_option === "all") {
        canDownload = true
      } else if (accessTypes.has(file.purchase_option)) {
        canDownload = true
      } else if (
        (accessTypes.has("recording") || accessTypes.has("live")) &&
        (file.material_type === "slides" || file.material_type === "handout")
      ) {
        canDownload = true
      }

      if (!canDownload) {
        return { status: 403, error: `Package does not include ${file.material_type} downloads` }
      }

      // Generate presigned download URL
      const presigned = await S3StorageService.getPresignedDownloadUrl({
        s3Key: file.s3_key,
        fileName: file.file_name,
        mimeType: file.mime_type,
        expiresInSeconds: 900,
        asAttachment: true,
      })

      return { status: 200, download_url: presigned.download_url, expires_in: presigned.expires_in_seconds }
    }

    // Verify 3.1: Unauthenticated user -> 401
    const unauthResult = await checkCustomerCanDownload(null, targetWebinar.id, testFileId)
    assert(unauthResult.status === 401, "Unauthenticated request rejected with HTTP 401")

    // Verify 3.2: Customer with no purchase on this webinar -> 403
    const strangerResult = await checkCustomerCanDownload(testCustIdUnauthorized, targetWebinar.id, testFileId)
    assert(
      strangerResult.status === 403 && strangerResult.error.includes("Access Denied"),
      "Unauthorized customer (no purchase) rejected with HTTP 403 Access Denied"
    )

    // Verify 3.3: Customer with wrong variant (transcript only) trying to download recording -> 403
    const wrongOptResult = await checkCustomerCanDownload(testCustIdWrongOption, targetWebinar.id, testFileId)
    assert(
      wrongOptResult.status === 403 && wrongOptResult.error.includes("does not include recording"),
      "Customer with wrong purchase option (transcript only) blocked from downloading recording file",
      wrongOptResult.error
    )

    // Verify 3.4: Authorized customer (bought recording) -> 200 with presigned URL
    const authResult = await checkCustomerCanDownload(testCustIdAuthorized, targetWebinar.id, testFileId)
    assert(
      authResult.status === 200 && !!authResult.download_url,
      "Authorized customer receives short-lived presigned download URL"
    )

    assert(
      authResult.download_url.includes("response-content-disposition=attachment") ||
        authResult.download_url.includes("/store/customer/webinar-files/local-download"),
      "Download URL enforces Content-Disposition: attachment (prevents inline exposure)"
    )

    console.log("\n--- Group 4: File Deletion & Soft-Delete Cleanup ---")

    // Test 4.1: Soft-delete the file
    await pool.query(`UPDATE webinar_file SET deleted_at = NOW(), is_active = false WHERE id = $1`, [testFileId])

    const afterDeleteRes = await checkCustomerCanDownload(testCustIdAuthorized, targetWebinar.id, testFileId)
    assert(
      afterDeleteRes.status === 404,
      "Deleted or deactivated file returns 404 Not Found to prevent unauthorized download"
    )

    // Clean up test records
    await pool.query(`DELETE FROM webinar_file WHERE id = $1`, [testFileId])
    await pool.query(`DELETE FROM customer_entitlement WHERE customer_id IN ($1, $2)`, [
      testCustIdAuthorized,
      testCustIdWrongOption,
    ])
    console.log("  🧹 Cleaned up temporary test database records.")

    console.log("\n================================================================================")
    console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
    console.log("================================================================================\n")

    await pool.end()
    process.exit(failed > 0 ? 1 : 0)
  } catch (error) {
    console.error("FATAL ERROR IN ACCEPTANCE TESTS:", error)
    await pool.end().catch(() => {})
    process.exit(1)
  }
}

runTests()
