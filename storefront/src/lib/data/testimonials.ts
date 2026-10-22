import { fetchWithTimeout } from "@lib/util/fetch"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"

export interface TestimonialItem {
  id: string
  customer_name: string
  designation: string
  company?: string | null
  avatar_url?: string | null
  content: string
  rating: number
  featured_homepage: boolean
  display_order: number
  created_at: string
}

export async function getTestimonials(params: { homepage_only?: boolean } = {}): Promise<TestimonialItem[]> {
  try {
    const query = new URLSearchParams()
    if (params.homepage_only) {
      query.append("homepage_only", "true")
    }

    const res = await fetchWithTimeout(`${BACKEND_URL}/store/testimonials?${query.toString()}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.error("Failed to fetch testimonials:", await res.text())
      return []
    }

    const data = await res.json()
    return data.testimonials || []
  } catch (error) {
    console.error("Error in getTestimonials:", error)
    return []
  }
}
