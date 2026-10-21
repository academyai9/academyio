import { fetchWithTimeout } from "@lib/util/fetch"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface StoreSocialLink {
  id: string
  platform: string
  name: string
  url: string
  icon: string
  custom_icon_url?: string | null
  label?: string | null
  open_in_new_tab: boolean
  display_order: number
}

export interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

export interface SocialMediaResponse {
  global_enabled: boolean
  social_links: StoreSocialLink[]
  settings?: SectionSettings
}

export async function getStoreSocialLinks(): Promise<SocialMediaResponse> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/social-media`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      console.error("Failed to fetch social media links:", await res.text())
      return { global_enabled: true, social_links: [] }
    }

    const data = await res.json()
    return {
      global_enabled: data.global_enabled !== false,
      social_links: data.social_links || [],
      settings: data.settings,
    }
  } catch (error) {
    console.error("Error in getStoreSocialLinks:", error)
    return { global_enabled: true, social_links: [] }
  }
}
