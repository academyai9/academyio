import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseURL()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/dashboard",
          "/*/dashboard/*",
          "/*/account",
          "/*/account/*",
          "/*/checkout",
          "/*/checkout/*",
          "/*/cart",
          "/*/order/*",
          "/*/reset-password",
          "/*/forgot-password",
          "/api/*",
          "/admin/*",
          "/webapp/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
