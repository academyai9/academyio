import { fetchWithTimeout } from "@lib/util/fetch"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"

export interface AccreditationOrg {
  id: string
  code: string
  name: string
  short_name: string
  logo_url: string
  website_url?: string | null
  alt_text: string
  description?: string | null
  default_credit_type: string
  display_order: number
}

export interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

export interface OrganizationsResponse {
  global_enabled: boolean
  organizations: AccreditationOrg[]
  settings?: SectionSettings
}

export async function getAccreditationOrganizations(): Promise<OrganizationsResponse> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/organizations`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error("Failed to fetch organizations:", await res.text())
      return { global_enabled: true, organizations: [] }
    }

    const data = await res.json()
    return {
      global_enabled: data.global_enabled !== false,
      organizations: data.organizations || [],
      settings: data.settings,
    }
  } catch (error) {
    console.error("Error in getAccreditationOrganizations:", error)
    return { global_enabled: true, organizations: [] }
  }
}
