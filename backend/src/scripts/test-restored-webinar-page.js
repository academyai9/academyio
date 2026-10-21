const http = require("http")
const fs = require("fs")
const path = require("path")

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => resolve({ status: res.statusCode, data }))
      res.on("error", reject)
    })
  })
}

async function testRestoredWebinarPage() {
  console.log("==============================================================")
  console.log("   ACADEMYIO WEBINAR DETAILS PAGE RESTORATION AUDIT          ")
  console.log("==============================================================\n")

  const slug = "s-corp-basis-analysis-form-7203"
  const url = `http://localhost:8000/us/webinars/${slug}`

  // 1. Fetch restored page
  console.log(`[TEST 1] Fetching restored webinar page: ${url}...`)
  const response = await fetchUrl(url)
  if (response.status !== 200) {
    throw new Error(`Expected HTTP 200, received ${response.status}`)
  }
  console.log("  ✓ Page loaded successfully with HTTP 200 OK")

  const html = response.data

  // 2. Original Hero Section
  console.log("\n[TEST 2] Verifying original dark slate-950 hero header...")
  if (!html.includes("bg-slate-950") || !html.includes("S Corp Basis Analysis")) {
    throw new Error("Original Hero header not restored!")
  }
  console.log("  ✓ Original Hero header (bg-slate-950) verified")

  // 3. Promotional banner with 150px desktop height
  console.log("\n[TEST 3] Verifying promotional banner with exact 150px desktop height...")
  if (!html.includes("lg:h-[150px]") || !html.includes("THANKS20")) {
    throw new Error("Promotional banner missing or not 150px desktop height!")
  }
  console.log("  ✓ Promotional banner verified with lg:h-[150px] and THANKS20 code")

  // 4. Original Left Column Sections
  console.log("\n[TEST 4] Verifying original left column sections...")
  const requiredSections = [
    "About the Instructor",
    "View Faculty Profile",
    "Course Overview &amp; Program Description",
    "Key Learning Objectives",
    "Target Audience &amp; Qualifications",
    "Credits and Other Information",
    "Cancellation &amp; Guarantee Policy",
  ]
  for (const sec of requiredSections) {
    if (!html.includes(sec)) {
      throw new Error(`Missing restored section: ${sec}`)
    }
  }
  console.log("  ✓ All original left-column sections verified")

  // 5. Original Sticky Purchase Options Box
  console.log("\n[TEST 5] Verifying original sticky purchase options box...")
  if (!html.includes("Select Purchase Option") || !html.includes("Select Self-Study Option")) {
    // one of them must be present
  }
  if (!html.includes("Select Purchase Option")) {
    throw new Error("Original purchase options title missing!")
  }
  if (!html.includes("Instant Dashboard Access") || !html.includes("Verified Certificate Eligible")) {
    throw new Error("Original trust badges missing!")
  }
  console.log("  ✓ Original sticky purchase box and trust badges verified")

  // 6. Original Related Courses Section
  console.log("\n[TEST 6] Verifying original related courses section...")
  if (!html.includes("Related Courses &amp; Masterclasses")) {
    throw new Error("Original Related Courses section missing!")
  }
  console.log("  ✓ Original related courses section verified")

  // 7. Verify redesign component files are deleted
  console.log("\n[TEST 7] Verifying redesign files have been cleanly deleted...")
  const redesignFiles = [
    "WebinarAgendaSection.tsx",
    "WebinarFAQSection.tsx",
    "WebinarLearningObjectives.tsx",
    "WebinarMaterialsSection.tsx",
    "WebinarOverviewSection.tsx",
    "WebinarPurchaseCard.tsx",
    "WebinarSpeakerSection.tsx",
    "WebinarSupportTrustSection.tsx",
    "WebinarTargetAudience.tsx",
  ]
  const componentsDir = path.resolve(__dirname, "../../../storefront/src/components/webinars")
  for (const f of redesignFiles) {
    const fullPath = path.join(componentsDir, f)
    if (fs.existsSync(fullPath)) {
      throw new Error(`Redesign file ${f} still exists! It should have been deleted.`)
    }
  }
  console.log("  ✓ All 9 redesign sub-components confirmed deleted")

  console.log("\n==============================================================")
  console.log("   ALL RESTORATION AUDIT TESTS PASSED!                        ")
  console.log("==============================================================\n")
}

testRestoredWebinarPage()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ RESTORATION AUDIT FAILED:", err.message)
    process.exit(1)
  })
