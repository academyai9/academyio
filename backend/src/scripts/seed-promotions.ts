import { Pool } from "pg"
import { PromotionalBannerService } from "../modules/webinar/promotional-banner-service"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

async function seedThanksgivingPromotion() {
  const client = await pool.connect()
  try {
    console.log("Checking existing promotional banners...")
    const existing = await client.query(
      `SELECT * FROM promotional_banner WHERE coupon_code = $1`,
      ["THANKS20"]
    )

    const now = new Date()
    // Offer ends in 16 days (e.g. November 30)
    const endDate = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000)

    let bannerId: string

    if (existing.rows.length > 0) {
      bannerId = existing.rows[0].id
      console.log(`Updating existing THANKS20 banner (${bannerId})...`)
      await PromotionalBannerService.updateBanner(bannerId, {
        title: "Thanksgiving Day Sale",
        description: "Save 20% on all eligible masterclasses and professional webinars! Use code at checkout.",
        discount_text: "Save 20%",
        coupon_code: "THANKS20",
        discount_type: "percentage",
        discount_value: 20,
        start_date: new Date(now.getTime() - 24 * 60 * 60 * 1000), // started yesterday
        end_date: endDate,
        timezone: "EST",
        cta_text: "Copy Code",
        style_preset: "festive_amber",
        icon: "🦃",
        show_countdown: true,
        scope: "all",
        priority: 100,
        is_active: true,
      })
    } else {
      console.log("Creating new THANKS20 promotional banner...")
      const created = await PromotionalBannerService.createBanner({
        title: "Thanksgiving Day Sale",
        description: "Save 20% on all eligible masterclasses and professional webinars! Use code at checkout.",
        discount_text: "Save 20%",
        coupon_code: "THANKS20",
        discount_type: "percentage",
        discount_value: 20,
        start_date: new Date(now.getTime() - 24 * 60 * 60 * 1000), // started yesterday
        end_date: endDate,
        timezone: "EST",
        cta_text: "Copy Code",
        style_preset: "festive_amber",
        icon: "🦃",
        show_countdown: true,
        scope: "all",
        priority: 100,
        is_active: true,
      })
      bannerId = created.id
    }

    console.log("Seeding complete! Banner ID:", bannerId)

    const activeBanner = await PromotionalBannerService.getActiveBannerForWebinar()
    console.log("Active Banner retrieved:", {
      id: activeBanner?.id,
      title: activeBanner?.title,
      coupon_code: activeBanner?.coupon_code,
      status: activeBanner?.status,
      show_countdown: activeBanner?.show_countdown,
    })

    // Verify Medusa promotion record
    const promoCheck = await client.query(
      `SELECT id, code, is_automatic, type, status FROM promotion WHERE code = $1`,
      ["THANKS20"]
    )
    console.log("Medusa Promotion Record:", promoCheck.rows[0])

    const appMethod = await client.query(
      `SELECT id, promotion_id, type, target_type, value, currency_code FROM promotion_application_method WHERE promotion_id = $1`,
      [promoCheck.rows[0]?.id]
    )
    console.log("Medusa Application Method Record:", appMethod.rows[0])
  } finally {
    client.release()
    await pool.end()
  }
}

seedThanksgivingPromotion()
  .then(() => {
    console.log("Done seeding promotional banner.")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Seed error:", err)
    process.exit(1)
  })
