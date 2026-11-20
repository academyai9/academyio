/**
 * Sanitizes rich HTML content (e.g. webinar descriptions) to prevent Stored XSS.
 * Strips dangerous tags (<script>, <iframe>, <object>, <embed>, <svg>, <math>, <form>, <style>, <link>, <meta>),
 * strips inline event handlers (on*=...), and neutralizes javascript:/vbscript:/data: URLs.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html || typeof html !== "string") return ""

  let clean = html
    // Remove script, iframe, object, embed, style, svg, math, form, link, meta tags and their contents
    .replace(/<(script|iframe|object|embed|style|svg|math|form|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|style|svg|math|form|input|button|link|meta|base)\b[^>]*\/?>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Strip inline event handlers (onload, onerror, onclick, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Neutralize javascript:, vbscript:, and data: URIs in href/src/action/formaction attributes
    .replace(
      /\b(href|src|action|formaction|xlink:href)\s*=\s*(["'])\s*(?:javascript|vbscript|data)\s*:[\s\S]*?\2/gi,
      '$1="#"'
    )
    .replace(
      /\b(href|src|action|formaction|xlink:href)\s*=\s*(?:javascript|vbscript|data)\s*:[^\s>]+/gi,
      '$1="#"'
    )

  return clean
}
