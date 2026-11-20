/**
 * Validates that a redirect target is a safe, relative same-origin path.
 * Blocks protocol-relative URLs (//evil.com), absolute URLs (https://evil.com),
 * javascript:/data: URIs, backslashes, and control characters.
 */
export function sanitizeRedirectPath(
  rawTarget: string | null | undefined,
  fallback: string = "/us/dashboard"
): string {
  if (!rawTarget || typeof rawTarget !== "string") {
    return fallback
  }

  const trimmed = rawTarget.trim()

  // Must start with a single forward slash and not be protocol-relative or backslash-escaped
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\") ||
    /[\r\n\t\0]/.test(trimmed)
  ) {
    return fallback
  }

  // Decode once to ensure encoded protocol schemes or double slashes cannot sneak through
  try {
    const decoded = decodeURIComponent(trimmed)
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded) ||
      /[\r\n\t\0]/.test(decoded)
    ) {
      return fallback
    }
  } catch {
    return fallback
  }

  return trimmed
}
