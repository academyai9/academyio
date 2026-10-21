const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface StoreTrackingCode {
  id: string
  name: string
  type: string
  tracking_id: string | null
  custom_code: string | null
  placement: "head" | "body_start" | "body_end"
  target_pages: "all" | "homepage" | "webinars" | "subscriptions" | "checkout" | "custom"
  target_paths?: string[] | null
  is_enabled: boolean
  updated_at?: string
}

export async function getStoreTrackingCodes(): Promise<StoreTrackingCode[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/tracking-codes`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    })

    if (!res.ok) {
      console.warn("Failed to fetch store tracking codes:", res.status)
      return []
    }

    const data = await res.json()
    return data.tracking_codes || []
  } catch (error) {
    console.error("Error in getStoreTrackingCodes:", error)
    return []
  }
}
