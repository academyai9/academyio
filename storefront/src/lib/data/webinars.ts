const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface WebinarItem {
  id: string
  title: string
  slug: string
  short_description: string | null
  description: string | null
  featured_image: string | null
  speaker_name: string
  speaker_title: string | null
  speaker_bio: string | null
  speaker_photo: string | null
  event_date: string
  start_time: string
  end_time: string
  timezone: string
  duration_minutes: number
  category: string
  tags?: string[]
  learning_objectives?: string[]
  target_audience?: string | null
  cpe_credits: number
  status: string
  is_featured: boolean
  is_upcoming: boolean
  is_ondemand: boolean
  is_seminar: boolean
  has_live: boolean
  has_recording: boolean
  has_transcript: boolean
  public_resources_count: number
  product_id?: string
  variants?: Array<{
    id: string
    title: string
    sku: string
    option_type: "live" | "recording" | "transcript" | "pdf" | "bundle"
    includes: {
      live: boolean
      recording: boolean
      transcript: boolean
      pdf: boolean
    }
  }>
  available_options?: Array<{
    type: string
    label: string
    available: boolean
  }>
}

export async function getWebinars(params: {
  category?: string
  type?: "upcoming" | "ondemand" | "seminar" | "all"
  search?: string
  limit?: number
  offset?: number
  featured?: boolean
} = {}): Promise<{ webinars: WebinarItem[]; count: number }> {
  try {
    const query = new URLSearchParams()
    if (params.category) query.append("category", params.category)
    if (params.type && params.type !== "all") query.append("type", params.type)
    if (params.search) query.append("search", params.search)
    if (params.featured) query.append("featured", "true")
    if (params.limit) query.append("limit", params.limit.toString())
    if (params.offset) query.append("offset", params.offset.toString())

    const res = await fetch(`${BACKEND_URL}/store/webinars?${query.toString()}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      console.error("Failed to fetch webinars:", await res.text())
      return { webinars: [], count: 0 }
    }

    return await res.json()
  } catch (error) {
    console.error("Error fetching webinars:", error)
    return { webinars: [], count: 0 }
  }
}

export async function getWebinarBySlug(slug: string): Promise<WebinarItem | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/webinars/${slug}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return data.webinar
  } catch (error) {
    console.error(`Error fetching webinar ${slug}:`, error)
    return null
  }
}

export async function getCustomerEntitlements(token: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/store/customer/entitlements`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return null
    }

    return await res.json()
  } catch (error) {
    console.error("Error fetching customer entitlements:", error)
    return null
  }
}

export async function getCustomerWebinarAccess(token: string, webinarId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/store/customer/webinars/${webinarId}/access`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return null
    }

    return await res.json()
  } catch (error) {
    console.error(`Error fetching webinar access for ${webinarId}:`, error)
    return null
  }
}
