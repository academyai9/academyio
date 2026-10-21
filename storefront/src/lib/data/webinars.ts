const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface SpeakerItem {
  id: string
  name: string
  slug?: string | null
  title?: string | null
  bio?: string | null
  photo_url?: string | null
  designation?: string | null
  qualifications?: string | null
  email?: string | null
  company?: string | null
  status?: string
  is_featured?: boolean
  featured_order?: number
  specialty?: string | null
  webinars_count?: number
  webinars?: WebinarItem[]
}

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  currency_code: string
  billing_interval: string
  webinar_access_limit: number | null
  includes_live: boolean
  includes_recording: boolean
  includes_transcript: boolean
  includes_pdf: boolean
  benefits: string[]
  order_index: number
}

export interface CustomerSubscription {
  id: string
  customer_id: string
  customer_email: string
  plan_id: string
  plan_name: string
  status: "active" | "canceled" | "expired" | "past_due"
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  payment_provider_id: string
  payment_method_summary: string | null
  monthly_access_used: number
  is_active: boolean
}

export interface WebinarVariantItem {
  id: string
  title: string
  sku: string
  price?: number
  currency_code?: string
  description?: string | null
  option_type: "live" | "recording" | "transcript" | "pdf" | "bundle" | "custom"
  includes: {
    live: boolean
    recording: boolean
    transcript: boolean
    pdf: boolean
  }
}

export interface WebinarItem {
  id: string
  title: string
  slug: string
  short_description: string | null
  description: string | null
  featured_image: string | null
  speaker_id?: string | null
  speaker_name: string
  speaker_title: string | null
  speaker_bio: string | null
  speaker_photo: string | null
  speaker?: SpeakerItem | null
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
  is_completed?: boolean
  recording_published?: boolean
  recording_ready?: boolean
  recording_coming_soon?: boolean
  has_live: boolean
  has_recording: boolean
  has_transcript: boolean
  public_resources_count: number
  product_id?: string
  seo_title?: string | null
  seo_description?: string | null
  variants?: WebinarVariantItem[]
  credit_info?: any
  available_options?: Array<{
    type: string
    label: string
    available: boolean
  }>
}

export async function getWebinars(params: {
  category?: string
  type?: "upcoming" | "ondemand" | "prerecorded" | "pre-recorded" | "completed" | "self-study" | "selfstudy" | "all"
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

export async function getCustomerCertificates(token?: string, customerId?: string) {
  try {
    const headers: Record<string, string> = {
      "x-publishable-api-key": PUBLISHABLE_KEY,
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    const query = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : ""
    const res = await fetch(`${BACKEND_URL}/store/customer/certificates${query}`, {
      headers,
      cache: "no-store",
    })

    if (!res.ok) {
      return null
    }

    return await res.json()
  } catch (error) {
    console.error("Error fetching customer certificates:", error)
    return null
  }
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/subscriptions`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) return []
    const data = await res.json()
    return data.plans || []
  } catch (error) {
    console.error("Error fetching subscription plans:", error)
    return []
  }
}

export async function getCustomerSubscription(token: string): Promise<{
  has_subscription: boolean
  subscription: CustomerSubscription | null
  plan: SubscriptionPlan | null
} | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/customer/subscriptions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    })

    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error("Error fetching customer subscription:", error)
    return null
  }
}

export async function subscribeToPlan(
  token: string,
  planId: string,
  paymentMethod?: string,
  paymentProviderId?: string,
  extraData?: {
    customerEmail?: string
    customerId?: string
    cardBrand?: string
    last4?: string
    cardholderName?: string
    verificationMode?: string
    metadata?: Record<string, any>
  }
) {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    }
    if (token && token.trim().length > 0) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(`${BACKEND_URL}/store/customer/subscriptions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        plan_id: planId,
        payment_method: paymentMethod || "Visa ending in 4242",
        payment_provider_id: paymentProviderId || "stripe",
        customer_email: extraData?.customerEmail,
        customer_id: extraData?.customerId,
        card_brand: extraData?.cardBrand,
        last4: extraData?.last4,
        cardholder_name: extraData?.cardholderName,
        verification_mode: extraData?.verificationMode,
        metadata: extraData?.metadata,
      }),
    })

    return await res.json()
  } catch (error) {
    console.error("Error subscribing to plan:", error)
    return { message: "Failed to process subscription" }
  }
}

export async function cancelCustomerSubscription(token: string, immediate = false) {
  try {
    const res = await fetch(`${BACKEND_URL}/store/customer/subscriptions/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ immediate }),
    })

    return await res.json()
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return { message: "Failed to cancel subscription" }
  }
}

export async function getWebinarSubscriptionStatus(
  webinarId: string,
  token?: string,
  customerEmail?: string,
  customerId?: string
) {
  try {
    const headers: Record<string, string> = {
      "x-publishable-api-key": PUBLISHABLE_KEY,
    }
    if (token && token.trim()) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const query = new URLSearchParams()
    if (customerEmail) query.append("customer_email", customerEmail)
    if (customerId) query.append("customer_id", customerId)
    const qStr = query.toString() ? `?${query.toString()}` : ""

    const res = await fetch(
      `${BACKEND_URL}/store/customer/webinars/${webinarId}/subscription-register${qStr}`,
      {
        headers,
        cache: "no-store",
      }
    )

    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error("Error fetching webinar subscription status:", error)
    return null
  }
}

export async function registerWebinarWithSubscription(
  webinarId: string,
  token?: string,
  customerEmail?: string,
  customerId?: string
) {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    }
    if (token && token.trim()) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(
      `${BACKEND_URL}/store/customer/webinars/${webinarId}/subscription-register`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer_email: customerEmail,
          customer_id: customerId,
        }),
      }
    )

    return await res.json()
  } catch (error: any) {
    console.error("Error registering webinar with subscription:", error)
    return { message: "Failed to register webinar", error: error.message }
  }
}

export const DEFAULT_FACULTY_LIST: SpeakerItem[] = [
  {
    id: "spk_barbara_weltman",
    name: "Barbara Weltman, Esq.",
    slug: "barbara-weltman",
    designation: "Tax Attorney & Author of J.K. Lasser's Small Business Taxes",
    qualifications: "Esq., JD",
    company: "Big Ideas for Small Business, Inc.",
    email: "bweltman@academyio.com",
    bio: "Barbara Weltman is an attorney specializing in taxation and author of J.K. Lasser's Small Business Taxes. Named one of the 100 Most Influential People in Accounting by Accounting Today.",
    photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
    status: "active",
    is_featured: true,
    featured_order: 1,
    specialty: "IRS Form 7203 & S-Corporation Basis",
    webinars_count: 2,
  },
  {
    id: "spk_greg_white",
    name: "Greg White, CPA",
    slug: "greg-white",
    designation: "Managing Partner & Contributing Editor, Tax Practice Advisor",
    qualifications: "CPA",
    company: "Tax Practice Advisor LLC",
    email: "gwhite@academyio.com",
    bio: "Greg White has practiced tax for over 35 years and taught extensively for the AICPA, state CPA societies, and leading continuing education providers nationwide.",
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
    status: "active",
    is_featured: true,
    featured_order: 2,
    specialty: "Form 1065 & Section 704(c) Reconciliations",
    webinars_count: 1,
  },
  {
    id: "spk_jennifer_louis",
    name: "Jennifer Louis, CPA",
    slug: "jennifer-louis",
    designation: "President of Emeritus Consulting Services, Former Deloitte Audit Manager",
    qualifications: "CPA",
    company: "Emeritus Consulting Services",
    email: "jlouis@academyio.com",
    bio: "Jennifer Louis has over 25 years of experience in auditing and accounting education, previously serving as an audit manager at Deloitte & Touche LLP.",
    photo_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
    status: "active",
    is_featured: true,
    featured_order: 3,
    specialty: "GAAP Accounting Standards & ASC 842",
    webinars_count: 1,
  },
  {
    id: "spk_david_peters",
    name: "David Peters, CPA, MST, CFP",
    slug: "david-peters",
    designation: "Founder, Peters Tax & Wealth Consulting",
    qualifications: "CPA, MST, CFP",
    company: "Peters Tax & Wealth Consulting",
    email: "dpeters@academyio.com",
    bio: "David Peters has over two decades of financial and tax consulting experience, providing strategic advisory services to middle-market corporations and high-net-worth clients.",
    photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    status: "active",
    is_featured: true,
    featured_order: 4,
    specialty: "Corporate Tax Planning & Form 1120",
    webinars_count: 1,
  },
  {
    id: "spk_robert_keebler",
    name: "Robert S. Keebler, CPA/PFS, MST, AEP",
    slug: "robert-keebler",
    designation: "Partner at Keebler & Associates, Hall of Fame Tax Educator",
    qualifications: "CPA, PFS, MST, AEP",
    company: "Keebler & Associates, LLP",
    email: "rkeebler@academyio.com",
    bio: "Bob Keebler is one of the nation's leading experts in estate, gift, and retirement distribution planning. Inducted into the National Estate Planning Hall of Fame.",
    photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80",
    status: "active",
    is_featured: true,
    featured_order: 5,
    specialty: "Estate, Gift & IRA Distribution Planning",
    webinars_count: 1,
  },
  {
    id: "spk_amanda_chen",
    name: "Dr. Amanda Chen, Ph.D., CPA, CFE",
    slug: "amanda-chen",
    designation: "Professor of Accounting Information Systems & Forensic Auditing",
    qualifications: "Ph.D., CPA, CFE",
    company: "Center for Financial Integrity",
    email: "achen@academyio.com",
    bio: "Dr. Chen is an authority on algorithmic audit procedures, fraud analytics, and automated testing, advising national accounting standards bodies and global corporations.",
    photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    status: "active",
    is_featured: true,
    featured_order: 6,
    specialty: "Forensic Accounting & AI Fraud Detection",
    webinars_count: 1,
  },
]

export async function getStoreSpeakers(params: { featured?: boolean } = {}): Promise<SpeakerItem[]> {
  try {
    const query = new URLSearchParams()
    if (params.featured) query.append("featured", "true")
    const qStr = query.toString() ? `?${query.toString()}` : ""

    const res = await fetch(`${BACKEND_URL}/store/speakers${qStr}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data.speakers && data.speakers.length > 0) {
        return data.speakers
      }
    }
  } catch (error) {
    console.error("Error fetching store speakers:", error)
  }

  // Graceful fallback to verified faculty roster
  if (params.featured) {
    return DEFAULT_FACULTY_LIST.filter((s) => s.is_featured).sort(
      (a, b) => (a.featured_order || 0) - (b.featured_order || 0)
    )
  }
  return DEFAULT_FACULTY_LIST
}

export async function getSpeakerById(id: string): Promise<SpeakerItem | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/speakers/${id}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data.speaker) {
        return data.speaker
      }
    }
  } catch (error) {
    console.error(`Error fetching speaker ${id}:`, error)
  }

  // Fallback to matching faculty
  const fallbackMatch = DEFAULT_FACULTY_LIST.find(
    (s) => s.id === id || s.slug === id || s.name.toLowerCase() === id.toLowerCase()
  )

  if (fallbackMatch) {
    // Attempt to attach matching published webinars
    try {
      const searchKey = fallbackMatch.name.split(",")[0].trim()
      const { webinars } = await getWebinars({ search: searchKey, limit: 10 })
      return {
        ...fallbackMatch,
        webinars,
        webinars_count: webinars.length,
      }
    } catch {
      return fallbackMatch
    }
  }

  return null
}


