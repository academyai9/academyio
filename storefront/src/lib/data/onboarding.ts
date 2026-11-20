"use server"
import { cookies as nextCookies } from "next/headers"
import { redirect } from "next/navigation"

export async function resetOnboardingState(orderId: string) {
  const cookies = await nextCookies()
  cookies.set("_medusa_onboarding", "false", { maxAge: -1, path: "/" })
  if (process.env.NODE_ENV !== "production" && /^[a-zA-Z0-9_-]+$/.test(orderId)) {
    redirect(`/us/order/${orderId}/confirmed`)
  }
  redirect("/us/dashboard")
}
