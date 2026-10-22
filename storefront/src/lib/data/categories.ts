import { sdk } from "@lib/config"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { getWebinars } from "./webinars"
import { fetchWithTimeout } from "@lib/util/fetch"

export interface OfficialCategory {
  id: string
  name: string
  slug: string
  handle: string
  description: string
  badge: string
  iconName: string
  image: string
  webinars_count?: number
  gradient: string
  borderAccent: string
}

export const OFFICIAL_CATEGORIES: OfficialCategory[] = [
  {
    id: "pcat_accounting",
    name: "Accounting",
    slug: "accounting",
    handle: "accounting",
    description: "Explore accounting principles, financial reporting, bookkeeping, auditing, and professional accounting education.",
    badge: "CPE Accredited",
    iconName: "Calculator",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    gradient: "from-blue-600 to-indigo-600",
    borderAccent: "hover:border-blue-500",
  },
  {
    id: "pcat_healthcare",
    name: "Healthcare",
    slug: "healthcare",
    handle: "healthcare",
    description: "Learn about healthcare administration, compliance, regulations, healthcare operations, and professional development.",
    badge: "Regulatory & Compliance",
    iconName: "HeartPulse",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    gradient: "from-emerald-600 to-teal-600",
    borderAccent: "hover:border-emerald-500",
  },
  {
    id: "pcat_housing",
    name: "Housing",
    slug: "housing",
    handle: "housing",
    description: "Explore housing regulations, property management, real estate compliance, housing programs, and related professional education.",
    badge: "Property & Section 42",
    iconName: "Building2",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
    gradient: "from-amber-600 to-orange-600",
    borderAccent: "hover:border-amber-500",
  },
  {
    id: "pcat_hr_payroll",
    name: "Human Resources & Payroll",
    slug: "human-resources-payroll",
    handle: "human-resources-payroll",
    description: "Learn about HR management, payroll processing, employment law, workplace policies, employee benefits, and compliance.",
    badge: "Workforce & Labor Law",
    iconName: "Users",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80",
    gradient: "from-purple-600 to-pink-600",
    borderAccent: "hover:border-purple-500",
  },
  {
    id: "pcat_taxation",
    name: "Taxation",
    slug: "taxation",
    handle: "taxation",
    description: "Explore tax preparation, tax planning, IRS regulations, tax compliance, forms, deductions, and tax law updates.",
    badge: "IRS Forms & Codes",
    iconName: "Landmark",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
    gradient: "from-indigo-600 to-blue-700",
    borderAccent: "hover:border-indigo-500",
  },
  {
    id: "pcat_technology",
    name: "Technology",
    slug: "technology",
    handle: "technology",
    description: "Discover AI tools, software, cybersecurity, data analytics, automation, and technology solutions for professionals.",
    badge: "AI & Cybersecurity",
    iconName: "Cpu",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
    gradient: "from-cyan-600 to-blue-600",
    borderAccent: "hover:border-cyan-500",
  },
]

export const getOfficialCategories = async (): Promise<OfficialCategory[]> => {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/categories`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        return OFFICIAL_CATEGORIES.map((def) => {
          const match = data.categories.find(
            (c: any) =>
              c.handle === def.slug ||
              c.name.toLowerCase() === def.name.toLowerCase()
          )
          return {
            ...def,
            webinars_count: match ? Number(match.webinars_count) || 0 : 0,
          }
        })
      }
    }
  } catch (e) {
    // Fall back to computing counts from getWebinars
  }

  try {
    const { webinars } = await getWebinars({ limit: 100 })
    return OFFICIAL_CATEGORIES.map((def) => {
      const count = webinars.filter(
        (w) => w.category?.toLowerCase() === def.name.toLowerCase()
      ).length
      return {
        ...def,
        webinars_count: count,
      }
    })
  } catch {
    return OFFICIAL_CATEGORIES
  }
}

export const getOfficialCategoryBySlug = (slug: string): OfficialCategory | undefined => {
  const normalized = decodeURIComponent(slug).toLowerCase().trim()
  return OFFICIAL_CATEGORIES.find(
    (c) =>
      c.slug.toLowerCase() === normalized ||
      c.handle.toLowerCase() === normalized ||
      c.name.toLowerCase() === normalized
  )
}

// Legacy Medusa product categories methods (preserved for backward compatibility)
export const listCategories = async (query?: Record<string, any>) => {
  try {
    const next = {
      ...(await getCacheOptions("categories")),
    }

    const limit = query?.limit || 100

    return await sdk.client
      .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
        "/store/product-categories",
        {
          query: {
            fields:
              "*category_children, *products, *parent_category, *parent_category.parent_category",
            limit,
            ...query,
          },
          next,
          cache: "force-cache",
        }
      )
      .then(({ product_categories }) => product_categories)
  } catch (error) {
    return []
  }
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  try {
    const handle = `${categoryHandle.join("/")}`

    const next = {
      ...(await getCacheOptions("categories")),
    }

    return await sdk.client
      .fetch<HttpTypes.StoreProductCategoryListResponse>(
        `/store/product-categories`,
        {
          query: {
            fields: "*category_children, *products",
            handle,
          },
          next,
          cache: "force-cache",
        }
      )
      .then(({ product_categories }) => product_categories[0])
  } catch (error) {
    return undefined as unknown as HttpTypes.StoreProductCategory
  }
}
