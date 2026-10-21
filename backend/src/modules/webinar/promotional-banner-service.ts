import { Pool } from "pg"
import crypto from "crypto"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export type BannerStatus = "Active" | "Scheduled" | "Expired" | "Disabled"

export interface PromotionalBannerData {
  id: string
  title: string
  description: string
  discount_text: string
  coupon_code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  start_date?: string | Date | null
  end_date?: string | Date | null
  timezone: string
  cta_text: string
  cta_url?: string | null
  style_preset: "festive_amber" | "navy_blue" | "emerald_green" | "sunset_orange" | "purple_luxury" | "dark_gold"
  bg_color?: string | null
  text_color?: string | null
  accent_color?: string | null
  icon: string
  show_countdown: boolean
  terms_url?: string | null
  scope: "all" | "categories" | "webinars"
  target_categories?: string[]
  target_webinar_ids?: string[]
  target_options?: string[]
  priority: number
  is_active: boolean
  medusa_promotion_id?: string | null
  metadata?: Record<string, any>
  created_at: string | Date
  updated_at: string | Date
  status?: BannerStatus
}

export class PromotionalBannerService {
  /**
   * Compute dynamic status for banner
   */
  static computeStatus(banner: {
    is_active: boolean
    start_date?: string | Date | null
    end_date?: string | Date | null
  }): BannerStatus {
    if (!banner.is_active) return "Disabled"

    const now = new Date()
    if (banner.start_date && new Date(banner.start_date) > now) {
      return "Scheduled"
    }

    if (banner.end_date && new Date(banner.end_date) <= now) {
      return "Expired"
    }

    return "Active"
  }

  /**
   * Synchronize banner coupon with native Medusa 2.x promotion engine
   */
  static async syncMedusaPromotion(client: any, banner: PromotionalBannerData) {
    const code = banner.coupon_code.trim().toUpperCase()
    if (!code) return null

    const status = this.computeStatus(banner)
    const isMedusaActive = status === "Active"

    try {
      // 1. Check if promotion exists
      const existingPromoRes = await client.query(
        `SELECT id FROM promotion WHERE UPPER(code) = $1 AND deleted_at IS NULL LIMIT 1`,
        [code]
      )

      let promoId: string

      if (existingPromoRes.rows.length > 0) {
        promoId = existingPromoRes.rows[0].id
        await client.query(
          `UPDATE promotion
           SET status = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [isMedusaActive ? "active" : "inactive", promoId]
        )
      } else {
        promoId = `promo_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
        await client.query(
          `INSERT INTO promotion (id, code, type, status, is_automatic, created_at, updated_at)
           VALUES ($1, $2, 'standard', $3, false, NOW(), NOW())`,
          [promoId, code, isMedusaActive ? "active" : "inactive"]
        )
      }

      // 2. Sync application method
      const appMethodType = banner.discount_type === "fixed" ? "fixed" : "percentage"
      const appMethodVal = Number(banner.discount_value) || 20

      const existingAppMethod = await client.query(
        `SELECT id FROM promotion_application_method WHERE promotion_id = $1 LIMIT 1`,
        [promoId]
      )

      if (existingAppMethod.rows.length > 0) {
        await client.query(
          `UPDATE promotion_application_method
           SET type = $1,
               target_type = 'order',
               allocation = 'across',
               value = $2,
               currency_code = 'usd',
               updated_at = NOW()
           WHERE id = $3`,
          [appMethodType, appMethodVal, existingAppMethod.rows[0].id]
        )
      } else {
        const appMethodId = `app_method_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
        await client.query(
          `INSERT INTO promotion_application_method
            (id, promotion_id, type, target_type, allocation, value, currency_code, created_at, updated_at)
           VALUES
            ($1, $2, $3, 'order', 'across', $4, 'usd', NOW(), NOW())`,
          [appMethodId, promoId, appMethodType, appMethodVal]
        )
      }

      return promoId
    } catch (err) {
      console.error("[PromotionalBannerService] Error syncing Medusa promotion:", err)
      return null
    }
  }

  /**
   * Retrieve active, eligible promotional banner for a webinar
   */
  static async getActiveBannerForWebinar(params: {
    webinarId?: string
    category?: string
  } = {}): Promise<PromotionalBannerData | null> {
    const client = await pool.connect()
    try {
      const now = new Date()

      // Fetch all candidate banners that are active and not scheduled/expired
      const res = await client.query(
        `SELECT * FROM promotional_banner
         WHERE is_active = true
           AND (start_date IS NULL OR start_date <= $1)
           AND (end_date IS NULL OR end_date > $1)
         ORDER BY priority DESC, created_at DESC`,
        [now]
      )

      const banners: PromotionalBannerData[] = res.rows || []

      for (const b of banners) {
        let isEligible = false

        if (b.scope === "all") {
          isEligible = true
        } else if (b.scope === "categories" && params.category) {
          const catList = Array.isArray(b.target_categories) ? b.target_categories : []
          if (catList.some((c: string) => c.toLowerCase() === params.category?.toLowerCase())) {
            isEligible = true
          }
        } else if (b.scope === "webinars" && params.webinarId) {
          const webList = Array.isArray(b.target_webinar_ids) ? b.target_webinar_ids : []
          if (webList.includes(params.webinarId)) {
            isEligible = true
          }
        }

        if (isEligible) {
          return {
            ...b,
            status: "Active",
            target_categories: Array.isArray(b.target_categories) ? b.target_categories : [],
            target_webinar_ids: Array.isArray(b.target_webinar_ids) ? b.target_webinar_ids : [],
            target_options: Array.isArray(b.target_options) ? b.target_options : ["all"],
          }
        }
      }

      return null
    } finally {
      client.release()
    }
  }

  /**
   * List all promotional banners for Admin
   */
  static async listBanners(query?: {
    search?: string
    status?: string
    scope?: string
  }): Promise<PromotionalBannerData[]> {
    const client = await pool.connect()
    try {
      const res = await client.query(`SELECT * FROM promotional_banner ORDER BY priority DESC, created_at DESC`)
      let banners: PromotionalBannerData[] = (res.rows || []).map((b) => ({
        ...b,
        status: this.computeStatus(b),
        target_categories: Array.isArray(b.target_categories) ? b.target_categories : [],
        target_webinar_ids: Array.isArray(b.target_webinar_ids) ? b.target_webinar_ids : [],
        target_options: Array.isArray(b.target_options) ? b.target_options : ["all"],
      }))

      if (query?.search) {
        const q = query.search.toLowerCase()
        banners = banners.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.coupon_code.toLowerCase().includes(q) ||
            b.discount_text.toLowerCase().includes(q)
        )
      }

      if (query?.status && query.status !== "all") {
        banners = banners.filter((b) => b.status?.toLowerCase() === query.status?.toLowerCase())
      }

      if (query?.scope && query.scope !== "all") {
        banners = banners.filter((b) => b.scope === query.scope)
      }

      return banners
    } finally {
      client.release()
    }
  }

  /**
   * Retrieve banner by ID
   */
  static async getBannerById(id: string): Promise<PromotionalBannerData | null> {
    const client = await pool.connect()
    try {
      const res = await client.query(`SELECT * FROM promotional_banner WHERE id = $1 LIMIT 1`, [id])
      if (res.rows.length === 0) return null
      const b = res.rows[0]
      return {
        ...b,
        status: this.computeStatus(b),
        target_categories: Array.isArray(b.target_categories) ? b.target_categories : [],
        target_webinar_ids: Array.isArray(b.target_webinar_ids) ? b.target_webinar_ids : [],
        target_options: Array.isArray(b.target_options) ? b.target_options : ["all"],
      }
    } finally {
      client.release()
    }
  }

  /**
   * Create promotional banner
   */
  static async createBanner(input: Partial<PromotionalBannerData>): Promise<PromotionalBannerData> {
    const client = await pool.connect()
    try {
      const id = `pb_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
      const couponCode = (input.coupon_code || "OFFER").trim().toUpperCase()
      const title = input.title?.trim() || "Seasonal Promotional Sale"
      const description = input.description?.trim() || `Save on eligible webinars! Use code ${couponCode} at checkout.`
      const discountText = input.discount_text?.trim() || `Save ${input.discount_value || 20}%`
      const discountType = input.discount_type === "fixed" ? "fixed" : "percentage"
      const discountValue = Number(input.discount_value) || 20
      const timezone = input.timezone || "America/New_York"
      const ctaText = input.cta_text?.trim() || "Use Code"
      const stylePreset = input.style_preset || "festive_amber"
      const icon = input.icon || "🎉"
      const showCountdown = input.show_countdown !== false
      const scope = input.scope || "all"
      const targetCategories = Array.isArray(input.target_categories) ? input.target_categories : []
      const targetWebinarIds = Array.isArray(input.target_webinar_ids) ? input.target_webinar_ids : []
      const targetOptions = Array.isArray(input.target_options) ? input.target_options : ["all"]
      const priority = typeof input.priority === "number" ? input.priority : 100
      const isActive = input.is_active !== false

      const bannerData: PromotionalBannerData = {
        id,
        title,
        description,
        discount_text: discountText,
        coupon_code: couponCode,
        discount_type: discountType,
        discount_value: discountValue,
        start_date: input.start_date ? new Date(input.start_date) : null,
        end_date: input.end_date ? new Date(input.end_date) : null,
        timezone,
        cta_text: ctaText,
        cta_url: input.cta_url || null,
        style_preset: stylePreset,
        bg_color: input.bg_color || null,
        text_color: input.text_color || null,
        accent_color: input.accent_color || null,
        icon,
        show_countdown: showCountdown,
        terms_url: input.terms_url || null,
        scope,
        target_categories: targetCategories,
        target_webinar_ids: targetWebinarIds,
        target_options: targetOptions,
        priority,
        is_active: isActive,
        created_at: new Date(),
        updated_at: new Date(),
      }

      // Sync Medusa promotion
      const medusaPromoId = await this.syncMedusaPromotion(client, bannerData)
      bannerData.medusa_promotion_id = medusaPromoId

      await client.query(
        `INSERT INTO promotional_banner
          (id, title, description, discount_text, coupon_code, discount_type, discount_value, start_date, end_date, timezone, cta_text, cta_url, style_preset, bg_color, text_color, accent_color, icon, show_countdown, terms_url, scope, target_categories, target_webinar_ids, target_options, priority, is_active, medusa_promotion_id, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW())`,
        [
          id,
          title,
          description,
          discountText,
          couponCode,
          discountType,
          discountValue,
          bannerData.start_date,
          bannerData.end_date,
          timezone,
          ctaText,
          bannerData.cta_url,
          stylePreset,
          bannerData.bg_color,
          bannerData.text_color,
          bannerData.accent_color,
          icon,
          showCountdown,
          bannerData.terms_url,
          scope,
          JSON.stringify(targetCategories),
          JSON.stringify(targetWebinarIds),
          JSON.stringify(targetOptions),
          priority,
          isActive,
          medusaPromoId,
        ]
      )

      bannerData.status = this.computeStatus(bannerData)
      return bannerData
    } finally {
      client.release()
    }
  }

  /**
   * Update promotional banner
   */
  static async updateBanner(id: string, input: Partial<PromotionalBannerData>): Promise<PromotionalBannerData> {
    const client = await pool.connect()
    try {
      const existing = await this.getBannerById(id)
      if (!existing) {
        throw new Error(`Promotional banner '${id}' not found`)
      }

      const couponCode = (input.coupon_code || existing.coupon_code).trim().toUpperCase()
      const title = input.title !== undefined ? input.title.trim() : existing.title
      const description = input.description !== undefined ? input.description.trim() : existing.description
      const discountText = input.discount_text !== undefined ? input.discount_text.trim() : existing.discount_text
      const discountType = input.discount_type !== undefined ? input.discount_type : existing.discount_type
      const discountValue = input.discount_value !== undefined ? Number(input.discount_value) : existing.discount_value
      const startDate = input.start_date !== undefined ? (input.start_date ? new Date(input.start_date) : null) : existing.start_date
      const endDate = input.end_date !== undefined ? (input.end_date ? new Date(input.end_date) : null) : existing.end_date
      const timezone = input.timezone || existing.timezone
      const ctaText = input.cta_text !== undefined ? input.cta_text.trim() : existing.cta_text
      const stylePreset = input.style_preset || existing.style_preset
      const icon = input.icon || existing.icon
      const showCountdown = input.show_countdown !== undefined ? input.show_countdown : existing.show_countdown
      const scope = input.scope || existing.scope
      const targetCategories = input.target_categories !== undefined ? input.target_categories : existing.target_categories
      const targetWebinarIds = input.target_webinar_ids !== undefined ? input.target_webinar_ids : existing.target_webinar_ids
      const targetOptions = input.target_options !== undefined ? input.target_options : existing.target_options
      const priority = input.priority !== undefined ? input.priority : existing.priority
      const isActive = input.is_active !== undefined ? input.is_active : existing.is_active

      const updatedData: PromotionalBannerData = {
        ...existing,
        title,
        description,
        discount_text: discountText,
        coupon_code: couponCode,
        discount_type: discountType,
        discount_value: discountValue,
        start_date: startDate,
        end_date: endDate,
        timezone,
        cta_text: ctaText,
        cta_url: input.cta_url !== undefined ? input.cta_url : existing.cta_url,
        style_preset: stylePreset,
        bg_color: input.bg_color !== undefined ? input.bg_color : existing.bg_color,
        text_color: input.text_color !== undefined ? input.text_color : existing.text_color,
        accent_color: input.accent_color !== undefined ? input.accent_color : existing.accent_color,
        icon,
        show_countdown: showCountdown,
        terms_url: input.terms_url !== undefined ? input.terms_url : existing.terms_url,
        scope,
        target_categories: targetCategories,
        target_webinar_ids: targetWebinarIds,
        target_options: targetOptions,
        priority,
        is_active: isActive,
        updated_at: new Date(),
      }

      // Sync Medusa promotion
      const medusaPromoId = await this.syncMedusaPromotion(client, updatedData)
      updatedData.medusa_promotion_id = medusaPromoId

      await client.query(
        `UPDATE promotional_banner
         SET title = $1,
             description = $2,
             discount_text = $3,
             coupon_code = $4,
             discount_type = $5,
             discount_value = $6,
             start_date = $7,
             end_date = $8,
             timezone = $9,
             cta_text = $10,
             cta_url = $11,
             style_preset = $12,
             bg_color = $13,
             text_color = $14,
             accent_color = $15,
             icon = $16,
             show_countdown = $17,
             terms_url = $18,
             scope = $19,
             target_categories = $20,
             target_webinar_ids = $21,
             target_options = $22,
             priority = $23,
             is_active = $24,
             medusa_promotion_id = $25,
             updated_at = NOW()
         WHERE id = $26`,
        [
          title,
          description,
          discountText,
          couponCode,
          discountType,
          discountValue,
          startDate,
          endDate,
          timezone,
          ctaText,
          updatedData.cta_url,
          stylePreset,
          updatedData.bg_color,
          updatedData.text_color,
          updatedData.accent_color,
          icon,
          showCountdown,
          updatedData.terms_url,
          scope,
          JSON.stringify(targetCategories),
          JSON.stringify(targetWebinarIds),
          JSON.stringify(targetOptions),
          priority,
          isActive,
          medusaPromoId,
          id,
        ]
      )

      updatedData.status = this.computeStatus(updatedData)
      return updatedData
    } finally {
      client.release()
    }
  }

  /**
   * Delete banner
   */
  static async deleteBanner(id: string): Promise<boolean> {
    const client = await pool.connect()
    try {
      const banner = await this.getBannerById(id)
      if (banner && banner.coupon_code) {
        // Deactivate linked promotion in Medusa
        await client.query(`UPDATE promotion SET status = 'inactive' WHERE UPPER(code) = $1`, [
          banner.coupon_code.toUpperCase(),
        ])
      }
      const res = await client.query(`DELETE FROM promotional_banner WHERE id = $1`, [id])
      return (res.rowCount || 0) > 0
    } finally {
      client.release()
    }
  }

  /**
   * Toggle banner is_active
   */
  static async toggleActive(id: string): Promise<PromotionalBannerData | null> {
    const client = await pool.connect()
    try {
      const banner = await this.getBannerById(id)
      if (!banner) return null
      return await this.updateBanner(id, { is_active: !banner.is_active })
    } finally {
      client.release()
    }
  }
}
