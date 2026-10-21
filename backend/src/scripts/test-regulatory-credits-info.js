const { Client } = require("pg");

async function runTests() {
  console.log("=== Starting Comprehensive Acceptance Tests ===");

  const PUBLISHABLE_KEY = "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978";
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
  });
  await client.connect();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test Storefront Endpoints
  console.log("\n--- Testing Store APIs ---");
  const orgsRes = await fetch("http://localhost:9000/store/organizations", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const orgsData = await orgsRes.json();
  assert(orgsRes.status === 200, "GET /store/organizations returns 200 OK");
  assert(orgsData.global_enabled === true, "Organizations global_enabled is true");
  assert(Array.isArray(orgsData.organizations) && orgsData.organizations.length >= 4, `Organizations count >= 4 (got ${orgsData.organizations.length})`);

  const creditsRes = await fetch("http://localhost:9000/store/credits", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const creditsData = await creditsRes.json();
  assert(creditsRes.status === 200, "GET /store/credits returns 200 OK");
  assert(creditsData.global_enabled === true, "Credits global_enabled is true");
  assert(Array.isArray(creditsData.credit_types) && creditsData.credit_types.length >= 6, `Credit types count >= 6 (got ${creditsData.credit_types.length})`);

  const otherInfoRes = await fetch("http://localhost:9000/store/other-info", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const otherInfoData = await otherInfoRes.json();
  assert(otherInfoRes.status === 200, "GET /store/other-info returns 200 OK");
  assert(otherInfoData.global_enabled === true, "Other Info global_enabled is true");
  assert(Array.isArray(otherInfoData.items) && otherInfoData.items.length >= 4, `Other info items count >= 4 (got ${otherInfoData.items.length})`);

  // 2. Test Live Homepage HTML
  console.log("\n--- Testing Live Homepage HTML (port 8000) ---");
  const homeRes = await fetch("http://localhost:8000/us");
  const homeHtml = await homeRes.text();
  assert(homeRes.status === 200, "Homepage returns 200 OK");
  assert(homeHtml.includes("Recognized by Leading Professional Regulatory Bodies"), "Homepage contains Regulatory Bodies section");
  assert(homeHtml.includes("Earn Certified Continuing Professional Education Credits"), "Homepage contains Credits section");
  assert(homeHtml.includes("Continuing Education Standards &amp; Compliance Disclosures") || homeHtml.includes("Continuing Education Standards & Compliance Disclosures"), "Homepage contains Other Information section");
  assert(homeHtml.includes("NASBA CPE Credits"), "Homepage renders active credit type 'NASBA CPE Credits'");
  assert(homeHtml.includes("Attendance &amp; Real-Time Polling Verification") || homeHtml.includes("Attendance & Real-Time Polling Verification"), "Homepage renders other info item 'Attendance & Real-Time Polling Verification'");

  // 3. Test Global Master Switches
  console.log("\n--- Testing Global Master Switch Toggles ---");
  // Disable Credits Section
  await client.query("UPDATE homepage_section_settings SET is_enabled = false WHERE section_key = 'credits'");
  const creditsDisabledRes = await fetch("http://localhost:9000/store/credits", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const creditsDisabledData = await creditsDisabledRes.json();
  assert(creditsDisabledData.global_enabled === false, "GET /store/credits reflects global_enabled = false when master switch is OFF");
  assert(creditsDisabledData.credit_types.length === 0, "No credits returned when master switch is OFF");

  // Re-enable Credits Section
  await client.query("UPDATE homepage_section_settings SET is_enabled = true WHERE section_key = 'credits'");
  const creditsReenabledRes = await fetch("http://localhost:9000/store/credits", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const creditsReenabledData = await creditsReenabledRes.json();
  assert(creditsReenabledData.global_enabled === true, "GET /store/credits reflects global_enabled = true when master switch is ON");
  assert(creditsReenabledData.credit_types.length > 0, "Credits returned when master switch is ON");

  // Disable Other Info Section
  await client.query("UPDATE homepage_section_settings SET is_enabled = false WHERE section_key = 'other_info'");
  const otherInfoDisabledRes = await fetch("http://localhost:9000/store/other-info", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const otherInfoDisabledData = await otherInfoDisabledRes.json();
  assert(otherInfoDisabledData.global_enabled === false, "GET /store/other-info reflects global_enabled = false when master switch is OFF");

  // Re-enable Other Info Section
  await client.query("UPDATE homepage_section_settings SET is_enabled = true WHERE section_key = 'other_info'");

  // 4. Test Individual Item Active / Inactive Switches
  console.log("\n--- Testing Individual Active Switches ---");
  // Deactivate CLE credit type
  await client.query("UPDATE credit_type SET is_active = false WHERE code = 'cle'");
  const cleDeactivatedRes = await fetch("http://localhost:9000/store/credits", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const cleDeactivatedData = await cleDeactivatedRes.json();
  const cleFound = cleDeactivatedData.credit_types.some(c => c.code === "cle");
  assert(!cleFound, "Inactive credit type 'cle' is NOT returned to storefront");

  // Verify it still exists in database
  const dbCle = await client.query("SELECT id, is_active FROM credit_type WHERE code = 'cle'");
  assert(dbCle.rows.length === 1 && dbCle.rows[0].is_active === false, "Inactive credit type record remains preserved in database");

  // Reactivate CLE
  await client.query("UPDATE credit_type SET is_active = true WHERE code = 'cle'");
  const cleReactivatedRes = await fetch("http://localhost:9000/store/credits", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const cleReactivatedData = await cleReactivatedRes.json();
  const cleReactivatedFound = cleReactivatedData.credit_types.some(c => c.code === "cle");
  assert(cleReactivatedFound, "Reactivated credit type 'cle' reappears on storefront");

  // 5. Test Homepage Visibility Toggle
  console.log("\n--- Testing Homepage Visibility Toggle ---");
  await client.query("UPDATE credit_type SET show_on_homepage = false WHERE code = 'cfp'");
  const cfpRes = await fetch("http://localhost:9000/store/credits", {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
  });
  const cfpData = await cfpRes.json();
  const cfpOnHome = cfpData.credit_types.some(c => c.code === "cfp");
  assert(!cfpOnHome, "Credit type with show_on_homepage = false is NOT returned for homepage");
  await client.query("UPDATE credit_type SET show_on_homepage = true WHERE code = 'cfp'");

  // 6. Test Unauthorized Access Protection
  console.log("\n--- Testing Security & Admin Auth ---");
  const unauthCredits = await fetch("http://localhost:9000/admin/credits");
  assert(unauthCredits.status === 401, "GET /admin/credits without credentials returns 401 Unauthorized");
  const unauthOrgs = await fetch("http://localhost:9000/admin/organizations");
  assert(unauthOrgs.status === 401, "GET /admin/organizations without credentials returns 401 Unauthorized");
  const unauthOtherInfo = await fetch("http://localhost:9000/admin/other-info");
  assert(unauthOtherInfo.status === 401, "GET /admin/other-info without credentials returns 401 Unauthorized");

  // 7. Test Soft Deletion & Persistence
  console.log("\n--- Testing Soft Deletion & Persistence ---");
  const testId = `ct_test_${Date.now()}`;
  await client.query(`
    INSERT INTO credit_type (id, code, name, category, default_credit_hours, is_active, show_on_homepage)
    VALUES ($1, $2, $3, $4, $5, true, true)
  `, [testId, `test_${Date.now()}`, "Test Special Credit", "General", "1.0 Credit"]);

  // Verify created
  const createdRes = await client.query("SELECT id, deleted_at FROM credit_type WHERE id = $1", [testId]);
  assert(createdRes.rows.length === 1 && createdRes.rows[0].deleted_at === null, "Test credit created in database");

  // Soft delete
  await client.query("UPDATE credit_type SET deleted_at = now() WHERE id = $1", [testId]);
  const deletedRes = await client.query("SELECT id, deleted_at FROM credit_type WHERE id = $1", [testId]);
  assert(deletedRes.rows.length === 1 && deletedRes.rows[0].deleted_at !== null, "Test credit soft-deleted; record preserved");

  // Cleanup test record
  await client.query("DELETE FROM credit_type WHERE id = $1", [testId]);

  await client.end();

  console.log("\n=================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
