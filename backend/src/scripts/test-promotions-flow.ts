import { Pool } from "pg"
import { PromotionalBannerService } from "../modules/webinar/promotional-banner-service"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

async function runPromotionsVerification() {
  console.log("=================================================");
  console.log("   ACADEMYIO PROMOTIONAL BANNER & COUPON AUDIT   ");
  console.log("=================================================\n");

  const client = await pool.connect()
  let testBannerId: string | null = null

  try {
    // 1. Verify Active Default Banner
    console.log("[TEST 1] Verifying Default Active Banner (Thanksgiving Sale)...")
    const active = await PromotionalBannerService.getActiveBannerForWebinar()
    if (!active) {
      throw new Error("Expected active banner, but received null!")
    }
    console.log("  ✓ Retrieved Active Banner:", active.title)
    console.log("  ✓ Coupon Code:", active.coupon_code)
    console.log("  ✓ Discount Text:", active.discount_text)
    console.log("  ✓ Countdown Enabled:", active.show_countdown)
    console.log("  ✓ Status:", active.status)
    if (active.coupon_code !== "THANKS20") {
      throw new Error(`Expected coupon code THANKS20, got ${active.coupon_code}`)
    }

    // 2. Verify Medusa Promotion Sync in Database
    console.log("\n[TEST 2] Verifying Native Medusa 2.0 Promotion Sync...")
    const promoRes = await client.query(
      `SELECT p.id, p.code, p.status, p.type, m.target_type, m.type as discount_type, m.value
       FROM promotion p
       LEFT JOIN promotion_application_method m ON m.promotion_id = p.id
       WHERE p.code = $1`,
      ["THANKS20"]
    )
    if (promoRes.rows.length === 0) {
      throw new Error("No Medusa promotion record found for THANKS20!")
    }
    const promo = promoRes.rows[0]
    console.log("  ✓ Medusa Promotion ID:", promo.id)
    console.log("  ✓ Code:", promo.code)
    console.log("  ✓ Status:", promo.status)
    console.log("  ✓ Target Type:", promo.target_type)
    console.log("  ✓ Value:", promo.value, promo.discount_type)
    if (promo.status !== "active") {
      throw new Error(`Expected promotion status 'active', got ${promo.status}`)
    }

    // 3. Test Targeting by Scope: Category Targeting
    console.log("\n[TEST 3] Testing Category-Targeted Promotion...")
    const catBanner = await PromotionalBannerService.createBanner({
      title: "Tax Season Exclusive 25% Off",
      description: "Exclusive discount on all IRS & Taxation masterclasses.",
      discount_text: "Save 25%",
      coupon_code: "TAXPRO25",
      discount_type: "percentage",
      discount_value: 25,
      scope: "categories",
      target_categories: ["Taxation", "Accounting"],
      priority: 200, // higher than THANKS20 (100)
      is_active: true,
      style_preset: "emerald_green",
      icon: "📊",
      show_countdown: true,
    })
    testBannerId = catBanner.id
    console.log("  ✓ Created Category Banner ID:", testBannerId)

    // For Taxation webinar -> should get TAXPRO25 (priority 200 > 100)
    const taxMatch = await PromotionalBannerService.getActiveBannerForWebinar({
      category: "Taxation",
    })
    console.log("  ✓ Query for category 'Taxation' matched:", taxMatch?.coupon_code)
    if (taxMatch?.coupon_code !== "TAXPRO25") {
      throw new Error(`Expected TAXPRO25 for Taxation category, got ${taxMatch?.coupon_code}`)
    }

    // For Healthcare webinar -> should fallback to THANKS20 (scope: 'all')
    const healthMatch = await PromotionalBannerService.getActiveBannerForWebinar({
      category: "Healthcare",
    })
    console.log("  ✓ Query for category 'Healthcare' fallback matched:", healthMatch?.coupon_code)
    if (healthMatch?.coupon_code !== "THANKS20") {
      throw new Error(`Expected fallback THANKS20 for Healthcare, got ${healthMatch?.coupon_code}`)
    }

    // 4. Test Inactive / Toggle Behavior
    console.log("\n[TEST 4] Testing Banner Toggle & Deactivation...")
    const toggled = await PromotionalBannerService.toggleActive(testBannerId)
    if (!toggled || toggled.is_active !== false) {
      throw new Error("Expected banner to be inactive after toggle!")
    }
    console.log("  ✓ Toggled active state to:", toggled.is_active)

    // Now query for Taxation should fall back to THANKS20 because TAXPRO25 is inactive
    const postToggleMatch = await PromotionalBannerService.getActiveBannerForWebinar({
      category: "Taxation",
    })
    console.log("  ✓ Query for 'Taxation' after toggle matched:", postToggleMatch?.coupon_code)
    if (postToggleMatch?.coupon_code !== "THANKS20") {
      throw new Error(`Expected fallback THANKS20 after deactivation, got ${postToggleMatch?.coupon_code}`)
    }

    // Check synced Medusa promo is marked inactive
    const inactivePromo = await client.query(
      `SELECT status FROM promotion WHERE code = $1`,
      ["TAXPRO25"]
    )
    console.log("  ✓ Synced Medusa promo status after banner toggle:", inactivePromo.rows[0]?.status)
    if (inactivePromo.rows[0]?.status !== "inactive") {
      throw new Error("Expected Medusa promo status to be 'inactive' when banner disabled")
    }

    // 5. Test Expiration Logic
    console.log("\n[TEST 5] Testing Expiration Logic...")
    const expiredBanner = await PromotionalBannerService.createBanner({
      title: "Flash Sale - Yesterday Only",
      description: "Already ended flash sale",
      discount_text: "Save 50%",
      coupon_code: "EXPIRED50",
      discount_type: "percentage",
      discount_value: 50,
      scope: "all",
      priority: 999, // very high priority, but expired!
      is_active: true,
      start_date: new Date(Date.now() - 48 * 3600 * 1000),
      end_date: new Date(Date.now() - 1000), // ended 1 second ago
      style_preset: "sunset_orange",
      icon: "⚡",
      show_countdown: true,
    })
    console.log("  ✓ Created Expired Banner with Status:", expiredBanner.status)
    if (expiredBanner.status !== "Expired") {
      throw new Error(`Expected status 'Expired', got ${expiredBanner.status}`)
    }

    // Even with priority 999, getActiveBannerForWebinar should NOT return expired banner
    const activeCheck = await PromotionalBannerService.getActiveBannerForWebinar()
    console.log("  ✓ Active banner ignores expired (got):", activeCheck?.coupon_code)
    if (activeCheck?.coupon_code === "EXPIRED50") {
      throw new Error("Expired banner should never be returned by getActiveBannerForWebinar!")
    }

    // Clean up expired banner
    await PromotionalBannerService.deleteBanner(expiredBanner.id)
    console.log("  ✓ Cleaned up expired test banner")

    // 6. Test Admin List & Filters
    console.log("\n[TEST 6] Testing Admin Listing & Query Filters...")
    const allBanners = await PromotionalBannerService.listBanners()
    console.log(`  ✓ Total banners found: ${allBanners.length}`)
    const searchResult = await PromotionalBannerService.listBanners({ search: "Thanksgiving" })
    console.log(`  ✓ Search for 'Thanksgiving': ${searchResult.length} match(es)`)
    if (searchResult.length === 0) {
      throw new Error("Search filter failed to find Thanksgiving banner!")
    }

    // Clean up test banner
    if (testBannerId) {
      await PromotionalBannerService.deleteBanner(testBannerId)
      console.log(`  ✓ Cleaned up test banner ${testBannerId}`)
      testBannerId = null
    }

    console.log("\n=================================================");
    console.log("   ALL 6 PROMOTIONS VERIFICATION TESTS PASSED!   ");
    console.log("=================================================\n");
  } catch (err: any) {
    console.error("\n❌ PROMOTIONS AUDIT FAILED:", err)
    if (testBannerId) {
      try {
        await PromotionalBannerService.deleteBanner(testBannerId)
      } catch {}
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runPromotionsVerification()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
