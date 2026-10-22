import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { getWebinars, getStoreSpeakers } from "@lib/data/webinars"

const TOPIC_SLUGS = [
  "taxation",
  "accounting-auditing",
  "human-resources",
  "technology-cybersecurity",
  "management-leadership",
  "finance-banking",
  "compliance-legal",
  "healthcare-pharma",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL()
  const countryCode = "us"
  const now = new Date()

  // 1. Core Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/${countryCode}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/${countryCode}/webinars`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/${countryCode}/webinars/upcoming`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/${countryCode}/webinars/self-study`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/${countryCode}/webinars/pre-recorded`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/${countryCode}/courses-by-topics`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/${countryCode}/subscriptions`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/${countryCode}/speakers`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/${countryCode}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/${countryCode}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/${countryCode}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/${countryCode}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/${countryCode}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/${countryCode}/refund-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/${countryCode}/cookie-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ]

  // 2. Topic Category Routes
  const topicRoutes: MetadataRoute.Sitemap = TOPIC_SLUGS.map((slug) => ({
    url: `${baseUrl}/${countryCode}/courses-by-topics/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  // 3. Dynamic Webinar Routes
  let webinarRoutes: MetadataRoute.Sitemap = []
  try {
    const webinarsData = await getWebinars({ limit: 100 })
    if (webinarsData && Array.isArray(webinarsData.webinars)) {
      webinarRoutes = webinarsData.webinars
        .filter((w) => w && w.slug)
        .map((w) => ({
          url: `${baseUrl}/${countryCode}/webinars/${w.slug}`,
          lastModified: w.updated_at ? new Date(w.updated_at) : now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
    }
  } catch (error) {
    console.error("Sitemap: Failed to load webinars dynamically", error)
  }

  // 4. Dynamic Speakers Routes
  let speakerRoutes: MetadataRoute.Sitemap = []
  try {
    const speakers = await getStoreSpeakers()
    if (speakers && Array.isArray(speakers)) {
      speakerRoutes = speakers
        .filter((s) => s && s.id)
        .map((s) => ({
          url: `${baseUrl}/${countryCode}/speakers/${s.id}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }))
    }
  } catch (error) {
    console.error("Sitemap: Failed to load speakers dynamically", error)
  }

  return [...staticRoutes, ...topicRoutes, ...webinarRoutes, ...speakerRoutes]
}
