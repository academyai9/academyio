/**
 * Utility functions for secure payment credential handling, masking, and non-destructive API connection tests
 */

export function maskKey(key: string | null | undefined): string {
  if (!key) return ""
  const trimmed = key.trim()
  if (trimmed.length === 0) return ""
  if (trimmed.length <= 8) return "••••••••"

  // Check known prefixes
  const prefixes = [
    "sk_live_",
    "sk_test_",
    "whsec_",
    "pk_live_",
    "pk_test_",
    "client_",
    "secret_",
  ]
  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      const suffix = trimmed.slice(-4)
      return `${prefix}••••••••${suffix}`
    }
  }

  const prefix = trimmed.slice(0, 4)
  const suffix = trimmed.slice(-4)
  return `${prefix}••••••••${suffix}`
}

export function isMaskedValue(val: string | null | undefined): boolean {
  if (!val) return false
  return val.includes("••••") || val.includes("****")
}

export interface TestConnectionResult {
  success: boolean
  message: string
  latency_ms: number
  details?: Record<string, any>
  error?: string
}

export async function testStripeConnection(secretKey: string): Promise<TestConnectionResult> {
  const startTime = Date.now()
  if (!secretKey || secretKey.trim().length === 0) {
    return {
      success: false,
      message: "Secret Key is required to test Stripe connection",
      latency_ms: 0,
      error: "MISSING_SECRET_KEY",
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const res = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey.trim()}`,
        "Stripe-Version": "2023-10-16",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const latency = Date.now() - startTime
    const data = await res.json()

    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        `Stripe API returned HTTP ${res.status}: ${res.statusText}`
      return {
        success: false,
        message: `Stripe connection failed: ${errMsg}`,
        latency_ms: latency,
        error: data?.error?.code || "STRIPE_API_ERROR",
        details: { http_status: res.status },
      }
    }

    const livemode = Boolean(data.livemode)
    const availableCurrencies = (data.available || []).map((b: any) =>
      (b.currency || "").toUpperCase()
    )

    return {
      success: true,
      message: `Successfully connected to Stripe (${livemode ? "Live Mode" : "Test Mode"}). Available currencies: ${availableCurrencies.join(", ") || "USD"}. Response time: ${latency}ms.`,
      latency_ms: latency,
      details: {
        livemode,
        object: data.object,
        available_currencies: availableCurrencies,
        instant_available: Boolean(data.instant_available),
      },
    }
  } catch (err: any) {
    const latency = Date.now() - startTime
    const isAbort = err.name === "AbortError"
    return {
      success: false,
      message: isAbort
        ? "Stripe API request timed out after 12s"
        : `Network error connecting to Stripe API: ${err.message}`,
      latency_ms: latency,
      error: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
    }
  }
}

export async function testPayPalConnection(
  clientId: string,
  clientSecret: string,
  environment: "sandbox" | "live" = "sandbox"
): Promise<TestConnectionResult> {
  const startTime = Date.now()
  if (!clientId || !clientSecret || clientId.trim().length === 0 || clientSecret.trim().length === 0) {
    return {
      success: false,
      message: "Client ID and Client Secret are required to test PayPal connection",
      latency_ms: 0,
      error: "MISSING_CREDENTIALS",
    }
  }

  const endpoint =
    environment === "live"
      ? "https://api-m.paypal.com/v1/oauth2/token"
      : "https://api-m.sandbox.paypal.com/v1/oauth2/token"

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    const basicAuth = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString("base64")

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
    })
    clearTimeout(timeout)

    const latency = Date.now() - startTime
    const data = await res.json()

    if (!res.ok) {
      const errMsg =
        data?.error_description ||
        data?.error ||
        `PayPal OAuth2 API returned HTTP ${res.status}`
      return {
        success: false,
        message: `PayPal connection failed: ${errMsg}`,
        latency_ms: latency,
        error: data?.error || "PAYPAL_OAUTH_FAILED",
        details: { http_status: res.status, environment },
      }
    }

    return {
      success: true,
      message: `Successfully authenticated with PayPal ${environment.toUpperCase()} OAuth2 API! Token type: ${data.token_type}, Scope: ${data.scope || "standard"}. Response time: ${latency}ms.`,
      latency_ms: latency,
      details: {
        environment,
        app_id: data.app_id,
        token_type: data.token_type,
        expires_in: data.expires_in,
        scope: data.scope,
      },
    }
  } catch (err: any) {
    const latency = Date.now() - startTime
    const isAbort = err.name === "AbortError"
    return {
      success: false,
      message: isAbort
        ? "PayPal OAuth2 API timed out after 12s"
        : `Network error connecting to PayPal API: ${err.message}`,
      latency_ms: latency,
      error: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
    }
  }
}
