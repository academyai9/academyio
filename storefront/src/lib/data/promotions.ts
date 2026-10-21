import { fetchWithTimeout } from "@lib/util/fetch"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface PromotionalBanner {
  id: string
  title: string
  description: string
  discount_text: string
  coupon_code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  start_date?: string | null
  end_date?: string | null
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
  status?: string
}

export async function getActivePromotionalBanner(params?: {
  webinarId?: string
  category?: string
}): Promise<PromotionalBanner | null> {
  try {
    const query = new URLSearchParams()
    if (params?.webinarId) query.set("webinar_id", params.webinarId)
    if (params?.category) query.set("category", params.category)

    const res = await fetchWithTimeout(`${BACKEND_URL}/store/promotions/active?${query.toString()}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return data.banner || null
  } catch (error) {
    console.error("Error fetching promotional banner:", error)
    return null
  }
}
