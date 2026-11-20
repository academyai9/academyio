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
          "/*/certificates/*",
          "/*/checkout",
          "/*/checkout/*",
          "/*/cart",
          "/*/order/*",
          "/*/login",
          "/*/register",
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
