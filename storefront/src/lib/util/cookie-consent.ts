export interface CookieConsentSettings {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
  timestamp: string
  version: number
}

export const COOKIE_CONSENT_KEY = "academyio_cookie_consent"
export const CONSENT_VERSION = 1

export const DEFAULT_CONSENT: CookieConsentSettings = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  timestamp: "",
  version: CONSENT_VERSION,
}

export function getStoredCookieConsent(): CookieConsentSettings | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CookieConsentSettings
    if (parsed && typeof parsed.necessary === "boolean") {
      return parsed
    }
  } catch (e) {
    console.error("Failed to parse cookie consent", e)
  }
  return null
}

export function saveCookieConsent(settings: Omit<CookieConsentSettings, "necessary" | "timestamp" | "version"> & { necessary?: boolean }): CookieConsentSettings {
  const fullSettings: CookieConsentSettings = {
    necessary: true,
    functional: Boolean(settings.functional),
    analytics: Boolean(settings.analytics),
    marketing: Boolean(settings.marketing),
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullSettings))
      window.dispatchEvent(new CustomEvent("academyio_consent_updated", { detail: fullSettings }))
    } catch (e) {
      console.error("Failed to save cookie consent", e)
    }
  }

  return fullSettings
}

export function openCookiePreferencesModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("academyio_open_cookie_preferences"))
  }
}
