export interface TrackingCodeRecord {
  id: string
  name: string
  type: string
  tracking_id: string | null
  custom_code: string | null
  placement: "head" | "body_start" | "body_end"
  target_pages: "all" | "homepage" | "webinars" | "subscriptions" | "checkout" | "custom"
  target_paths: string[] | null
  is_enabled: boolean
  description: string | null
  created_by: string
  last_updated_by: string
  created_at: string
  updated_at: string
}

export interface TrackingCodeAuditLog {
  id: string
  tracking_code_id: string
  action: "create" | "update" | "toggle" | "delete"
  changed_by: string
  changes: Record<string, any>
  ip_address?: string | null
  created_at: string
}

export async function ensureTrackingCodesTables(pgConnection: any) {
  await pgConnection.raw(`
    CREATE TABLE IF NOT EXISTS frontend_tracking_codes (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      tracking_id VARCHAR(255),
      custom_code TEXT,
      placement VARCHAR(50) NOT NULL DEFAULT 'head',
      target_pages VARCHAR(50) NOT NULL DEFAULT 'all',
      target_paths JSONB,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      description TEXT,
      created_by VARCHAR(255) DEFAULT 'admin',
      last_updated_by VARCHAR(255) DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tracking_code_audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      tracking_code_id VARCHAR(255) NOT NULL,
      action VARCHAR(50) NOT NULL,
      changed_by VARCHAR(255) NOT NULL,
      changes JSONB NOT NULL,
      ip_address VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tracking_codes_enabled ON frontend_tracking_codes (is_enabled);
    CREATE INDEX IF NOT EXISTS idx_tracking_codes_type ON frontend_tracking_codes (type);
    CREATE INDEX IF NOT EXISTS idx_tracking_logs_code_id ON tracking_code_audit_logs (tracking_code_id);
  `)
}

export interface ValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

export function validateTrackingCode(data: {
  name?: string
  type?: string
  tracking_id?: string | null
  custom_code?: string | null
  placement?: string
  target_pages?: string
}): ValidationResult {
  if (!data.name || !data.name.trim()) {
    return { valid: false, error: "Code Name is required." }
  }

  const validTypes = [
    "ga4",
    "gtm",
    "meta_pixel",
    "clarity",
    "linkedin",
    "gsc",
    "bing",
    "pinterest",
    "tiktok",
    "hotjar",
    "custom",
  ]

  if (!data.type || !validTypes.includes(data.type)) {
    return {
      valid: false,
      error: `Invalid Code Type. Must be one of: ${validTypes.join(", ")}`,
    }
  }

  const validPlacements = ["head", "body_start", "body_end"]
  if (data.placement && !validPlacements.includes(data.placement)) {
    return { valid: false, error: "Placement must be 'head', 'body_start', or 'body_end'." }
  }

  const validTargetPages = ["all", "homepage", "webinars", "subscriptions", "checkout", "custom"]
  if (data.target_pages && !validTargetPages.includes(data.target_pages)) {
    return { valid: false, error: "Target pages must be one of: " + validTargetPages.join(", ") }
  }

  const trackingId = data.tracking_id ? data.tracking_id.trim() : ""

  // Specific format validations
  switch (data.type) {
    case "ga4":
      if (!trackingId) {
        return { valid: false, error: "Google Analytics 4 Measurement ID is required (e.g., G-XXXXXXXXXX)." }
      }
      if (!/^G-[A-Z0-9]+$/i.test(trackingId)) {
        return {
          valid: false,
          error: "Invalid GA4 Measurement ID format. It must start with 'G-' followed by alphanumeric characters.",
        }
      }
      break

    case "gtm":
      if (!trackingId) {
        return { valid: false, error: "Google Tag Manager Container ID is required (e.g., GTM-XXXXXXX)." }
      }
      if (!/^GTM-[A-Z0-9]+$/i.test(trackingId)) {
        return {
          valid: false,
          error: "Invalid GTM Container ID format. It must start with 'GTM-' followed by alphanumeric characters.",
        }
      }
      break

    case "meta_pixel":
      if (!trackingId) {
        return { valid: false, error: "Meta Pixel ID is required (usually 14-16 digits)." }
      }
      if (!/^[0-9]{8,24}$/.test(trackingId)) {
        return {
          valid: false,
          error: "Invalid Meta Pixel ID format. It must be a numeric string between 8 and 24 digits.",
        }
      }
      break

    case "clarity":
      if (!trackingId) {
        return { valid: false, error: "Microsoft Clarity Project ID is required." }
      }
      if (!/^[a-z0-9_-]{5,24}$/i.test(trackingId)) {
        return { valid: false, error: "Invalid Microsoft Clarity ID format." }
      }
      break

    case "linkedin":
      if (!trackingId) {
        return { valid: false, error: "LinkedIn Partner ID is required (numeric)." }
      }
      if (!/^[0-9]{4,16}$/.test(trackingId)) {
        return { valid: false, error: "Invalid LinkedIn Partner ID. Must be numeric." }
      }
      break

    case "gsc":
      if (!trackingId) {
        return { valid: false, error: "Google Search Console verification code or meta content is required." }
      }
      break

    case "bing":
      if (!trackingId) {
        return { valid: false, error: "Bing Webmaster verification code is required." }
      }
      break

    case "custom":
      if (!data.custom_code || !data.custom_code.trim()) {
        return { valid: false, error: "Custom HTML or JavaScript tracking snippet is required." }
      }
      // Security checks for custom code
      const lowered = data.custom_code.toLowerCase()
      if (
        lowered.includes("medusa_auth_token") ||
        lowered.includes("_medusa_jwt") ||
        lowered.includes("document.cookie") ||
        lowered.includes("password")
      ) {
        return {
          valid: false,
          error: "Custom tracking code contains forbidden references to authentication tokens, credentials, or cookies.",
        }
      }
      break
  }

  return { valid: true }
}
