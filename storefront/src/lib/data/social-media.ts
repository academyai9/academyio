import { fetchWithTimeout } from "@lib/util/fetch"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"

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
      next: { revalidate: 60, tags: ["social_media"] },
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
