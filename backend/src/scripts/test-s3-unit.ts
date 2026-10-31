import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })
import { S3StorageService } from "../modules/webinar/s3-storage-service"

async function runUnitTests() {
  console.log("================================================================================")
  console.log("  ACADEMYIO S3 STORAGE SERVICE - UNIT & 500MB UPLOAD CAPABILITY VERIFICATION")
  console.log("================================================================================\n")

  let passed = 0
  let failed = 0

  function assert(condition: any, name: string, detail: string = "") {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${name} ${detail ? `(${detail})` : ""}`)
      failed++
    }
  }

  // Test 1: S3 Live configuration check
  const isLive = S3StorageService.isLiveS3Configured()
  console.log(`  ℹ️ Live S3/R2 Configured: ${isLive}`)
  assert(isLive === true, "Live S3 / Cloudflare R2 configured from environment variables")

  // Test 2: Standard 5MB PDF presigned upload URL
  const upload5mb = await S3StorageService.getPresignedUploadUrl({
    webinarId: "web_unit_test",
    materialType: "handout",
    fileName: "handout_notes.pdf",
    mimeType: "application/pdf",
    fileSize: 5 * 1024 * 1024,
  })
  assert(
    !!upload5mb.upload_url && upload5mb.s3_key.startsWith("webinars/web_unit_test/handout/"),
    "Generate presigned upload URL for standard PDF document",
    `Key: ${upload5mb.s3_key}`
  )

  // Test 3: 500MB PDF document upload (User's specific requirement)
  const upload500mb = await S3StorageService.getPresignedUploadUrl({
    webinarId: "web_unit_test",
    materialType: "handout",
    fileName: "comprehensive_500mb_course_study_pack.pdf",
    mimeType: "application/pdf",
    fileSize: 500 * 1024 * 1024, // 500 MB
  })
  assert(
    !!upload500mb.upload_url && upload500mb.s3_key.endsWith(".pdf"),
    "Allow 500MB PDF document upload without rejection",
    `URL generated, Key: ${upload500mb.s3_key}`
  )

  // Test 4: Document size up to 1GB is accepted
  const upload1gb = await S3StorageService.getPresignedUploadUrl({
    webinarId: "web_unit_test",
    materialType: "materials",
    fileName: "massive_1gb_resource.zip",
    mimeType: "application/zip",
    fileSize: 1024 * 1024 * 1024, // 1 GB
  })
  assert(
    !!upload1gb.upload_url && upload1gb.s3_key.includes("/materials/"),
    "Allow document/materials upload up to 1GB threshold",
    `Key: ${upload1gb.s3_key}`
  )

  // Test 5: Document oversize (> 1GB) is rejected
  let docOversizeError: any = null
  try {
    await S3StorageService.getPresignedUploadUrl({
      webinarId: "web_unit_test",
      materialType: "handout",
      fileName: "exceeds_limit.pdf",
      mimeType: "application/pdf",
      fileSize: 1.5 * 1024 * 1024 * 1024, // 1.5 GB
    })
  } catch (err: any) {
    docOversizeError = err
  }
  assert(
    docOversizeError && docOversizeError.message.includes("exceeds the allowable limit"),
    "Reject document exceeding 1GB threshold",
    docOversizeError?.message
  )

  // Test 6: Video upload up to 5GB is accepted
  const uploadVideo5gb = await S3StorageService.getPresignedUploadUrl({
    webinarId: "web_unit_test",
    materialType: "recording",
    fileName: "webinar_4k_session.mp4",
    mimeType: "video/mp4",
    fileSize: 4.5 * 1024 * 1024 * 1024, // 4.5 GB
  })
  assert(
    !!uploadVideo5gb.upload_url && uploadVideo5gb.s3_key.includes("/recording/"),
    "Allow video recording upload up to 5GB threshold",
    `Key: ${uploadVideo5gb.s3_key}`
  )

  // Test 7: Video oversize (> 5GB) is rejected
  let videoOversizeError: any = null
  try {
    await S3StorageService.getPresignedUploadUrl({
      webinarId: "web_unit_test",
      materialType: "recording",
      fileName: "too_large_video.mp4",
      mimeType: "video/mp4",
      fileSize: 6 * 1024 * 1024 * 1024, // 6 GB
    })
  } catch (err: any) {
    videoOversizeError = err
  }
  assert(
    videoOversizeError && videoOversizeError.message.includes("exceeds the allowable limit"),
    "Reject video recording exceeding 5GB threshold",
    videoOversizeError?.message
  )

  // Test 8: Security - reject malicious file extensions (.exe, .sh, .bat)
  let securityError: any = null
  try {
    await S3StorageService.getPresignedUploadUrl({
      webinarId: "web_unit_test",
      materialType: "handout",
      fileName: "invoice.pdf.exe",
      mimeType: "application/octet-stream",
      fileSize: 5000,
    })
  } catch (err: any) {
    securityError = err
  }
  assert(
    securityError && securityError.message.includes("strictly forbidden for security"),
    "Reject executable file extensions (.exe)",
    securityError?.message
  )

  // Test 9: Filename sanitization preserves safe characters and structure
  const sanitizedUpload = await S3StorageService.getPresignedUploadUrl({
    webinarId: "web_special_chars",
    materialType: "handout",
    fileName: "Tax & Wealth Strategies: 2026 Edition (Final).pdf",
    mimeType: "application/pdf",
    fileSize: 100000,
  })
  assert(
    sanitizedUpload.s3_key.includes("tax-wealth-strategies-2026-edition-final") &&
      !sanitizedUpload.s3_key.includes("&") &&
      !sanitizedUpload.s3_key.includes(":") &&
      sanitizedUpload.s3_key.endsWith(".pdf"),
    "Properly sanitize filenames for S3/R2 storage",
    `Key: ${sanitizedUpload.s3_key}`
  )

  console.log("\n================================================================================")
  console.log(`  UNIT TEST RESULTS: ${passed} PASSED | ${failed} FAILED`)
  console.log("================================================================================\n")

  if (failed > 0) {
    process.exit(1)
  }
}

runUnitTests().catch((e) => {
  console.error("Test error:", e)
  process.exit(1)
})
