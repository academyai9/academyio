import { fetchWithTimeout } from "@lib/util/fetch"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface StoreCreditType {
  id: string
  code: string
  name: string
  badge?: string | null
  description?: string | null
  category: string
  default_credit_hours: string
  organization_code?: string | null
  organization_name?: string | null
  organization_short_name?: string | null
  organization_logo_url?: string | null
  icon?: string | null
  display_order: number
}

export interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

export interface CreditsResponse {
  global_enabled: boolean
  credit_types: StoreCreditType[]
  settings?: SectionSettings
}

export async function getStoreCreditTypes(): Promise<CreditsResponse> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/credits`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      console.error("Failed to fetch store credit types:", await res.text())
      return { global_enabled: true, credit_types: [] }
    }

    const data = await res.json()
    return {
      global_enabled: data.global_enabled !== false,
      credit_types: data.credit_types || [],
      settings: data.settings,
    }
  } catch (error) {
    console.error("Error in getStoreCreditTypes:", error)
    return { global_enabled: true, credit_types: [] }
  }
}
