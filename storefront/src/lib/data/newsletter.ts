import { fetchWithTimeout } from "@lib/util/fetch"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"

export interface SubscribeResponse {
  success: boolean
  status?: "pending" | "active"
  message?: string
  error?: string
  emailSent?: boolean
}

export async function subscribeToNewsletter(data: {
  email: string
  firstName?: string
  consent: boolean
  captchaToken?: string
  source?: string
}): Promise<SubscribeResponse> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/newsletter/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        email: data.email,
        first_name: data.firstName,
        consent: data.consent,
        captcha_token: data.captchaToken,
        source: data.source || "website_footer",
      }),
      cache: "no-store",
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: json.error || json.message || "Failed to process subscription.",
      }
    }

    return json
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error. Please try again later.",
    }
  }
}

export async function verifyNewsletterSubscription(token: string): Promise<{
  success: boolean
  message?: string
  reason?: string
  error?: string
  subscriber?: { email?: string; first_name?: string }
}> {
  try {
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/store/newsletter/verify?token=${encodeURIComponent(token)}`,
      {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    )

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        reason: json.reason,
        error: json.error || "Failed to verify confirmation link.",
      }
    }

    return json
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error during verification.",
    }
  }
}

export async function getUnsubscribeInfo(token: string): Promise<{
  success: boolean
  maskedEmail?: string
  status?: string
  firstName?: string | null
  error?: string
}> {
  try {
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/store/newsletter/unsubscribe-info?token=${encodeURIComponent(token)}`,
      {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    )

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: json.error || "Subscriber not found.",
      }
    }

    return json
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error.",
    }
  }
}

export async function unsubscribeFromNewsletter(params: {
  token?: string
  email?: string
  reason?: string
}): Promise<{
  success: boolean
  alreadyUnsubscribed?: boolean
  message?: string
  error?: string
}> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/newsletter/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify(params),
      cache: "no-store",
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: json.error || "Failed to process unsubscribe request.",
      }
    }

    return json
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Network error.",
    }
  }
}
