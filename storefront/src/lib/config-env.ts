// Pure environment constants with zero dependencies to prevent pulling Node SDK into client bundles
const resolveBackendUrl = () => {
  const envUrl =
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

  if (envUrl) {
    // Automatically route away from suspended or deprecated Oregon instance to high-speed Ohio instance
    if (envUrl.includes("academyio-backend.onrender.com") && !envUrl.includes("-east")) {
      return "https://academyio-backend-east.onrender.com"
    }
    return envUrl
  }

  return process.env.NODE_ENV === "production" || process.env.VERCEL
    ? "https://academyio-backend-east.onrender.com"
    : "http://localhost:9000"
}

export const BACKEND_URL = resolveBackendUrl()

export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAFgxi8yKtuNeyzZv"

