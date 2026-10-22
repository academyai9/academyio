import { fetchWithTimeout } from "@lib/util/fetch"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"

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
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/tracking-codes`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 600 },
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
