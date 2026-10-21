import { fetchWithTimeout } from "@lib/util/fetch"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface StoreOtherInfoItem {
  id: string
  title: string
  description: string
  icon?: string | null
  image_url?: string | null
  link_url?: string | null
  link_text?: string | null
  badge?: string | null
  section: string
  display_order: number
}

export interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

export interface OtherInfoResponse {
  global_enabled: boolean
  items: StoreOtherInfoItem[]
  settings?: SectionSettings
}

export async function getStoreOtherInfo(): Promise<OtherInfoResponse> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/other-info`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      console.error("Failed to fetch store other info:", await res.text())
      return { global_enabled: true, items: [] }
    }

    const data = await res.json()
    return {
      global_enabled: data.global_enabled !== false,
      items: data.items || [],
      settings: data.settings,
    }
  } catch (error) {
    console.error("Error in getStoreOtherInfo:", error)
    return { global_enabled: true, items: [] }
  }
}
