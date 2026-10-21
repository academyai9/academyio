const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface ContactInfo {
  company_name: string
  street_address: string
  city: string
  state: string
  country: string
  postal_code: string
  formatted_address: string
  support_email: string
  support_phone: string
  support_hours: string
  broadcast_support_note: string
  map_link: string
  is_active: boolean
  updated_at?: string
}

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  company_name: "AcademyIO",
  street_address: "261 Blossom St",
  city: "Dos Palos",
  state: "California",
  country: "United States",
  postal_code: "93620",
  formatted_address: "261 Blossom St, Dos Palos, California, United States - 93620",
  support_email: "support@academyio.com",
  support_phone: "+1 (800) 555-CPE-PASS (toll free)",
  support_hours: "Monday - Friday: 8:00 AM - 6:00 PM EST",
  broadcast_support_note: "Available 30 minutes prior to scheduled start",
  map_link: "https://www.google.com/maps/search/?api=1&query=261+Blossom+St,+Dos+Palos,+California+93620",
  is_active: true,
}

export async function getContactInfo(): Promise<ContactInfo> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/contact-info`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      console.warn("Failed to fetch store contact info, using defaults")
      return DEFAULT_CONTACT_INFO
    }

    const data = await res.json()
    if (data.contact_info) {
      return {
        company_name: data.contact_info.company_name || DEFAULT_CONTACT_INFO.company_name,
        street_address: data.contact_info.street_address || DEFAULT_CONTACT_INFO.street_address,
        city: data.contact_info.city || DEFAULT_CONTACT_INFO.city,
        state: data.contact_info.state || DEFAULT_CONTACT_INFO.state,
        country: data.contact_info.country || DEFAULT_CONTACT_INFO.country,
        postal_code: data.contact_info.postal_code || DEFAULT_CONTACT_INFO.postal_code,
        formatted_address: data.contact_info.formatted_address || DEFAULT_CONTACT_INFO.formatted_address,
        support_email: data.contact_info.support_email || DEFAULT_CONTACT_INFO.support_email,
        support_phone: data.contact_info.support_phone || DEFAULT_CONTACT_INFO.support_phone,
        support_hours: data.contact_info.support_hours || DEFAULT_CONTACT_INFO.support_hours,
        broadcast_support_note:
          data.contact_info.broadcast_support_note || DEFAULT_CONTACT_INFO.broadcast_support_note,
        map_link: data.contact_info.map_link || DEFAULT_CONTACT_INFO.map_link,
        is_active: data.contact_info.is_active !== undefined ? Boolean(data.contact_info.is_active) : true,
        updated_at: data.contact_info.updated_at,
      }
    }

    return DEFAULT_CONTACT_INFO
  } catch (error) {
    console.error("Error in getContactInfo:", error)
    return DEFAULT_CONTACT_INFO
  }
}
