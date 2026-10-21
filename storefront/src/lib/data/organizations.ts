const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

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
    const res = await fetch(`${BACKEND_URL}/store/organizations`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
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
