import { fetchWithTimeout } from "@lib/util/fetch"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

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
      next: { revalidate: 30 },
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
