export const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "")
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.NODE_ENV === "production") {
    return "https://www.academyio.com"
  }
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000").replace(/\/$/, "")
}

