export interface CookieItem {
  name: string
  provider: string
  purpose: string
  expiry: string
  category: "necessary" | "functional" | "analytics" | "marketing"
}

export interface CookieCategoryInfo {
  id: "necessary" | "functional" | "analytics" | "marketing"
  title: string
  description: string
  required: boolean
  cookies: CookieItem[]
}

export interface CookiePolicyData {
  title: string
  last_updated: string
  version: number
  support_email: string
  lead_paragraphs: string[]
  categories: CookieCategoryInfo[]
  sections: {
    id: string
    title: string
    content: string[]
  }[]
}

export const OFFICIAL_COOKIE_POLICY: CookiePolicyData = {
  title: "Cookie Policy",
  last_updated: "October 23, 2026",
  version: 1,
  support_email: "privacy@academyio.com",
  lead_paragraphs: [
    "This Cookie Policy explains how AcademyIO LLC (\"AcademyIO,\" \"we,\" \"us,\" or \"our\") uses cookies, web beacons, tracking pixels, and similar technologies when you visit our website (www.academyio.com), register for continuing education courses, attend live webinars, or access on-demand professional learning resources.",
    "We believe in transparency regarding how we collect and use your data. This policy details what cookies are, the specific cookies we utilize, why we use them, and how you can exercise full control over your cookie preferences at any time.",
    "By continuing to browse our platform after being presented with our cookie notification, you agree to our use of cookies in accordance with the preferences you select.",
  ],
  categories: [
    {
      id: "necessary",
      title: "Strictly Necessary Cookies",
      description:
        "These cookies are indispensable for the core operation, security, and integrity of the AcademyIO platform. They enable critical features such as user authentication, cart persistence, checkout processing, and anti-fraud protections (e.g., Cloudflare Turnstile). Without these cookies, the services you request cannot be provided.",
      required: true,
      cookies: [
        {
          name: "_medusa_jwt",
          provider: "AcademyIO",
          purpose: "Maintains your authenticated customer session and secure access to your webinar dashboard and certificates.",
          expiry: "7 days",
          category: "necessary",
        },
        {
          name: "_medusa_cart_id",
          provider: "AcademyIO",
          purpose: "Preserves webinar registrations, course quantities, and checkout state throughout your browsing session.",
          expiry: "7 days",
          category: "necessary",
        },
        {
          name: "cf_clearance / __cf_bm",
          provider: "Cloudflare Turnstile",
          purpose: "Protects user registration, login forms, and transaction endpoints against credential stuffing, brute-force, and automated bots.",
          expiry: "Session / 1 year",
          category: "necessary",
        },
        {
          name: "academyio_cookie_consent",
          provider: "AcademyIO",
          purpose: "Stores your explicit cookie consent and category choices.",
          expiry: "1 year",
          category: "necessary",
        },
      ],
    },
    {
      id: "functional",
      title: "Functional & Preference Cookies",
      description:
        "These cookies remember choices you make while browsing to provide enhanced, personalized functionality. They allow us to recall your visual appearance mode (Dark/Light mode), video playback settings, and chosen regional settings.",
      required: false,
      cookies: [
        {
          name: "theme",
          provider: "AcademyIO",
          purpose: "Persists your preferred interface display mode (Day or Night / Dark Mode).",
          expiry: "1 year",
          category: "functional",
        },
        {
          name: "academyio_player_volume",
          provider: "AcademyIO",
          purpose: "Remembers audio volume and playback speed preferences during webinar streaming.",
          expiry: "30 days",
          category: "functional",
        },
      ],
    },
    {
      id: "analytics",
      title: "Performance & Analytics Cookies",
      description:
        "Analytics cookies collect aggregated, anonymous information about how visitors navigate and interact with AcademyIO. This data helps us monitor site performance, identify broken links, measure page load speeds, and refine course discovery for tax and financial professionals.",
      required: false,
      cookies: [
        {
          name: "_ga, _ga_*",
          provider: "Google Analytics 4",
          purpose: "Distinguishes unique users and measures anonymized usage statistics (pages visited, webinar duration, general geographical region).",
          expiry: "2 years",
          category: "analytics",
        },
        {
          name: "_gid",
          provider: "Google Analytics 4",
          purpose: "Stores and updates a unique value for each page visited to generate statistical reports.",
          expiry: "24 hours",
          category: "analytics",
        },
      ],
    },
    {
      id: "marketing",
      title: "Marketing & Targeting Cookies",
      description:
        "Marketing cookies help deliver relevant educational recommendations, measure the performance of our advertising campaigns, and ensure you do not see repetitive promotions. They track visits across websites to understand your professional interests.",
      required: false,
      cookies: [
        {
          name: "_fbp",
          provider: "Meta (Facebook)",
          purpose: "Measures ad conversion efficacy and delivers targeted webinar recommendations on Meta platforms.",
          expiry: "90 days",
          category: "marketing",
        },
        {
          name: "_gcl_au",
          provider: "Google Ads",
          purpose: "Used by Google AdSense and conversion tracking to understand campaign conversion efficiency.",
          expiry: "90 days",
          category: "marketing",
        },
      ],
    },
  ],
  sections: [
    {
      id: "what-are-cookies",
      title: "1. What Are Cookies and Tracking Technologies?",
      content: [
        "A cookie is a small data text file placed on your computer, smartphone, or other digital device when you visit an online service. Cookies are widely used by website operators to make websites work efficiently, enhance user navigation, and report site analytics.",
        "Cookies set by AcademyIO LLC are termed 'first-party cookies.' Cookies set by parties other than AcademyIO are referred to as 'third-party cookies.' Third-party cookies enable external features or functionality (such as analytics, interactive webinar video players, and fraud mitigation) to be provided on or through the website.",
        "In addition to standard cookies, we may use related technologies such as local storage (HTML5 web storage), session storage, pixel tags, and server-side logs to securely authenticate accounts and measure system health.",
      ],
    },
    {
      id: "how-we-use",
      title: "2. Why Do We Use Cookies?",
      content: [
        "We use both session cookies (which expire once you close your web browser) and persistent cookies (which remain on your device until they expire or you delete them) for multiple purposes:",
        "• To authenticate and verify customer accounts and protect attendees against fraudulent access.",
        "• To preserve your shopping cart, selected webinar formats (Live, On-Demand, Bundle), and checkout progress.",
        "• To remember your display preferences, including Dark Mode and audio player settings.",
        "• To analyze visitor traffic, understand which webinar subjects are in highest demand, and optimize platform speed.",
        "• To measure advertising attribution and deliver relevant educational course recommendations.",
      ],
    },
    {
      id: "controlling-cookies",
      title: "3. How Can You Control and Manage Cookies?",
      content: [
        "You have the right to decide whether to accept or decline non-essential cookies. You can exercise your cookie rights through multiple channels:",
        "• On-Site Cookie Preferences Center: You can customize or withdraw your consent at any time by clicking the 'Cookie Preferences' link located in our website footer or using the 'Manage Cookie Preferences' button on this page.",
        "• Web Browser Controls: Most web browsers allow you to manage cookie settings through their preferences. You can set your browser to refuse all cookies or to alert you when a cookie is being sent. Please note that if you disable strictly necessary cookies, some features of our site (such as signing in or completing a webinar registration) may not function properly.",
        "• Third-Party Opt-Outs: You can also opt out of targeted advertising by visiting the Digital Advertising Alliance (https://optout.aboutads.info) or the Network Advertising Initiative (https://optout.networkadvertising.org).",
      ],
    },
    {
      id: "policy-updates",
      title: "4. Updates to This Cookie Policy",
      content: [
        "We may update this Cookie Policy from time to time to reflect changes in the cookies we use, technological advancements, or regulatory requirements. When changes are published, we will revise the 'Last Updated' date at the top of this page.",
        "We encourage you to review this Cookie Policy periodically to stay informed about our use of cookies and related technologies.",
      ],
    },
    {
      id: "contact-us",
      title: "5. Contact Information",
      content: [
        "If you have questions, comments, or concerns about our use of cookies or this Cookie Policy, please reach out to our Data Privacy Officer at:",
        "AcademyIO LLC\nAttn: Privacy & Compliance Office\nEmail: privacy@academyio.com\nWebsite: https://www.academyio.com",
      ],
    },
  ],
}
