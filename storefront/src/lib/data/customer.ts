"use server"

import { sdk } from "@lib/config"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"
import { verifyTurnstileToken } from "@lib/util/verify-turnstile"
import { fetchWithTimeout } from "@lib/util/fetch"
import { sanitizeRedirectPath } from "@lib/util/safe-redirect"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders || !("authorization" in authHeaders) || !(authHeaders as any).authorization) {
      return null
    }

    const headers = {
      ...authHeaders,
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders,+metadata,+company_name,+phone",
        },
        headers,
        cache: "no-store",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export async function signup(_currentState: unknown, formData: FormData) {
  // 1. Anti-Bot Protection: Honeypot Trap
  const honeypot = (formData.get("website_url_hp") as string || "").trim()
  if (honeypot) {
    console.warn("[ANTI-BOT] Registration blocked: honeypot field filled.")
    return "Security verification failed. Please try again."
  }

  // 2. Anti-Bot Protection: Cloudflare Turnstile CAPTCHA Token Check
  const captchaToken = (
    (formData.get("cf-turnstile-response") as string) ||
    (formData.get("captcha_token") as string) ||
    ""
  ).trim()

  if (!captchaToken) {
    return "Please complete the security verification challenge before creating your account."
  }

  const password = formData.get("password") as string
  const rawFullName = (formData.get("full_name") as string || "").trim()
  let firstName = (formData.get("first_name") as string || "").trim()
  let lastName = (formData.get("last_name") as string || "").trim()

  if (rawFullName && (!firstName || !lastName)) {
    const parts = rawFullName.split(/\s+/)
    firstName = parts[0] || ""
    lastName = parts.slice(1).join(" ") || ""
  }

  const rawPtin = (formData.get("ptin") as string || "").trim().toUpperCase()
  const rawCfpId = (formData.get("cfp_id") as string || "").trim()
  const company_name = (formData.get("company_name") as string || "").trim() || null
  const phone = (formData.get("phone") as string || "").trim() || null

  // Extract multiple attendee emails
  const rawAttendeeEmails = (formData.get("additional_attendee_emails") as string || "").trim()
  let attendeeEmailList: string[] = []
  if (rawAttendeeEmails) {
    try {
      const parsed = JSON.parse(rawAttendeeEmails)
      if (Array.isArray(parsed)) {
        attendeeEmailList = parsed.map((e: any) => String(e).trim().toLowerCase()).filter(Boolean)
      }
    } catch (_) {
      attendeeEmailList = rawAttendeeEmails.split(/[,\n;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
    }
  }
  const singleAttendeeEmail = (formData.get("additional_attendee_email") as string || "").trim().toLowerCase()
  if (singleAttendeeEmail && !attendeeEmailList.includes(singleAttendeeEmail)) {
    attendeeEmailList.push(singleAttendeeEmail)
  }

  if (!phone) {
    return "Phone number is required."
  }

  const rawLicense = (formData.get("license_type") as string || "").trim()
  const license_type = rawLicense || (rawPtin ? "EA" : rawCfpId ? "CFP" : "General")

  // Validate PTIN if provided: Starts with a P followed by 8 digits (no spaces)
  let ptin: string | null = null
  if (rawPtin) {
    if (!/^P\d{8}$/.test(rawPtin)) {
      return "Invalid PTIN#. For Enrolled Agents, PTIN must start with 'P' followed by 8 digits (no spaces), e.g., P12345678."
    }
    ptin = rawPtin
  }

  const cfp_id = rawCfpId || null

  const metadata: Record<string, any> = {
    full_name: rawFullName || `${firstName} ${lastName}`.trim(),
    ptin: ptin || null,
    cfp_id: cfp_id || null,
    company_name: company_name || null,
    phone: phone || null,
    license_type: license_type || null,
    additional_attendee_emails: attendeeEmailList.length > 0 ? attendeeEmailList : null,
    additional_attendee_email: attendeeEmailList[0] || null,
    additional_attendee: attendeeEmailList.length > 0 ? attendeeEmailList.join(", ") : null,
  }

  const email = (formData.get("email") as string || "").trim().toLowerCase()
  if (!email) {
    return "Email address is required."
  }

  const customerForm: any = {
    email,
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    company_name: company_name,
    metadata,
  }

  // 3. Server-side Cloudflare Turnstile verification (when configured)
  if (process.env.TURNSTILE_SECRET_KEY) {
    const captchaCheck = await verifyTurnstileToken(captchaToken)
    if (!captchaCheck.success) {
      return captchaCheck.message || "Security verification failed. Please complete the CAPTCHA check and try again."
    }
  }

  // 4. Fast Direct Registration with Medusa Backend
  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
      captcha_token: captchaToken,
    } as any)

    // Create customer record linked to auth identity
    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      { authorization: `Bearer ${token}` }
    )

    // Generate authenticated customer session token
    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    if (customerCacheTag) revalidateTag(customerCacheTag)

    await transferCart().catch(() => null)

    return createdCustomer
  } catch (error: any) {
    const msg = error?.message || error?.toString() || ""

    if (msg.includes("Identity with email already exists") || msg.includes("already exists")) {
      return "An account with this email address already exists. Please sign in or reset your password."
    }

    if (msg.includes("invalid_captcha") || msg.includes("CAPTCHA")) {
      return "Security verification failed. Please complete the CAPTCHA check and try again."
    }

    return msg || "Failed to create account. Please try again."
  }
}

export async function updateCustomerProfile(formData: FormData) {
  const first_name = (formData.get("first_name") as string || "").trim()
  const last_name = (formData.get("last_name") as string || "").trim()
  const phone = (formData.get("phone") as string || "").trim() || null
  const company_name = (formData.get("company_name") as string || "").trim() || null
  const rawAttendeeEmails = (formData.get("additional_attendee_emails") as string || "").trim()
  let attendeeEmailList: string[] = []
  if (rawAttendeeEmails) {
    try {
      const parsed = JSON.parse(rawAttendeeEmails)
      if (Array.isArray(parsed)) {
        attendeeEmailList = parsed.map((e: any) => String(e).trim().toLowerCase()).filter(Boolean)
      }
    } catch (_) {
      attendeeEmailList = rawAttendeeEmails.split(/[,\n;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)
    }
  }
  const singleAttendeeEmail = (formData.get("additional_attendee_email") as string || "").trim().toLowerCase()
  if (singleAttendeeEmail && !attendeeEmailList.includes(singleAttendeeEmail)) {
    attendeeEmailList.push(singleAttendeeEmail)
  }

  const rawPtin = (formData.get("ptin") as string || "").trim().toUpperCase()
  const cfp_id = (formData.get("cfp_id") as string || "").trim() || null
  const license_type = (formData.get("license_type") as string || "").trim() || null

  let ptin: string | null = null
  if (rawPtin) {
    if (!/^P\d{8}$/.test(rawPtin)) {
      return {
        success: false,
        error: "Invalid PTIN#. PTIN must start with 'P' followed by 8 digits (no spaces), e.g., P12345678.",
      }
    }
    ptin = rawPtin
  }

  try {
    const updated = await updateCustomer({
      first_name: first_name || undefined,
      last_name: last_name || undefined,
      phone,
      company_name,
      metadata: {
        ptin,
        cfp_id,
        company_name,
        phone,
        license_type,
        ...(attendeeEmailList.length > 0
          ? {
              additional_attendee_emails: attendeeEmailList,
              additional_attendee_email: attendeeEmailList[0],
              additional_attendee: attendeeEmailList.join(", "),
            }
          : {}),
      },
    })
    return { success: true, customer: updated }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update profile." }
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = (formData.get("email") as string || "").trim().toLowerCase()
  const password = formData.get("password") as string

  if (!email || !password) {
    return "Please enter both your email address and password."
  }

  // 1. Core Authentication with Medusa Backend (Fast Direct Path)
  let token: string | null = null
  try {
    token = (await sdk.auth.login("customer", "emailpass", { email, password })) as string
  } catch (error: any) {
    console.warn("Login auth error response:", error?.message || error)
    const msg = error?.message || error?.toString() || ""

    if (
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("invalid") ||
      msg.toLowerCase().includes("credential") ||
      msg.toLowerCase().includes("401") ||
      msg.includes("Identity with email")
    ) {
      return "Invalid email or password. Please check your credentials and try again."
    }

    if (msg.includes("timeout") || msg.includes("Timeout") || msg.includes("fetch failed")) {
      return "Authentication service is warming up. Please try again in a few seconds."
    }

    return "Invalid email or password. Please check your credentials and try again."
  }

  if (!token) {
    return "Unable to log in. Please verify your credentials."
  }

  // 2. Set Auth Cookie & Invalidate Cache Tags
  await setAuthToken(token)
  const customerCacheTag = await getCacheTag("customers")
  if (customerCacheTag) revalidateTag(customerCacheTag)

  // 3. Transfer Cart if user enrolled before logging in
  try {
    await transferCart()
  } catch (cartError) {
    console.warn("Notice: Cart transfer during login skipped:", cartError)
  }

  // 4. Account status verification & last_login_at recording via authenticated Store API
  try {
    const customer = await retrieveCustomer().catch(() => null)
    const accStatus = customer?.metadata?.account_status
    if (accStatus === "inactive" || accStatus === "suspended") {
      await removeAuthToken()
      return `Your account has been ${accStatus}. Please contact AcademyIO Support at support@academyio.com for assistance.`
    }
    if (customer) {
      sdk.store.customer
        .update(
          {
            metadata: {
              ...(customer.metadata || {}),
              last_login_at: new Date().toISOString(),
            },
          },
          {},
          { authorization: `Bearer ${token}` }
        )
        .catch(() => null)
    }
  } catch (_) {}

  return null
}

export async function signout(countryCode: string, redirectTo?: string) {
  const authHeaders = await getAuthHeaders()
  if (authHeaders && "authorization" in authHeaders) {
    await fetchWithTimeout(`${BACKEND_URL}/auth/session`, {
      method: "DELETE",
      headers: {
        ...authHeaders,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    }).catch(() => null)
  }
  await sdk.auth.logout().catch(() => null)

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  if (customerCacheTag) revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  if (cartCacheTag) revalidateTag(cartCacheTag)

  const safeDest = sanitizeRedirectPath(
    redirectTo,
    `/${countryCode}/login?logged_out=true`
  )
  redirect(safeDest)
}

export async function transferCart() {
  try {
    const cartId = await getCartId()

    if (!cartId) {
      return
    }

    const headers = await getAuthHeaders()

    await sdk.store.cart.transferCart(cartId, {}, headers)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  } catch (error: any) {
    console.warn("Notice: Cart transfer during login:", error?.message || error)
    // Never remove cart cookie unless the cart genuinely does not exist (404 Not Found)
    const status = error?.status || error?.statusCode
    const msg = error?.message?.toLowerCase() || ""
    if (status === 404 || msg.includes("not found")) {
      await removeCartId()
    }
  }
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async ({ customer }) => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export async function requestPasswordReset(email: string) {
  const trimmedEmail = (email || "").trim().toLowerCase()
  if (!trimmedEmail) {
    return { success: false, error: "Please provide a valid email address." }
  }

  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/password-reset/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email: trimmedEmail }),
      cache: "no-store",
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.message || "Failed to process password reset." }
    }

    return {
      success: true,
      message:
        data.message ||
        "If an account exists with this email, you will receive password reset instructions shortly.",
    }
  } catch (err: any) {
    console.error("requestPasswordReset error:", err)
    return {
      success: false,
      error: "Network error occurred while requesting password reset. Please try again.",
    }
  }
}

export async function confirmPasswordReset(payload: { email?: string; token: string; password: string }) {
  const { email, token, password } = payload
  if (!token) {
    return { success: false, error: "Password reset token is missing." }
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." }
  }

  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/password-reset/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ email, token, password }),
      cache: "no-store",
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.message || "Failed to reset password." }
    }

    return { success: true, message: data.message }
  } catch (err: any) {
    console.error("confirmPasswordReset error:", err)
    return {
      success: false,
      error: "Network error occurred while resetting password. Please try again.",
    }
  }
}

export async function changeCustomerPassword(payload: {
  currentPassword: string
  newPassword: string
  email?: string
}) {
  const { currentPassword, newPassword, email } = payload

  if (!currentPassword) {
    return { success: false, error: "Current password is required." }
  }
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters long." }
  }
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return { success: false, error: "New password must contain at least one letter and one number." }
  }
  if (currentPassword === newPassword) {
    return { success: false, error: "New password must be different from your current password." }
  }

  const authHeaders = await getAuthHeaders()
  if (!authHeaders || !("authorization" in authHeaders)) {
    return { success: false, error: "Your session has expired. Please sign in again." }
  }

  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/customer/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...authHeaders,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.message || "Failed to change password." }
    }

    // Refresh HttpOnly session cookie with the new credentials
    if (email) {
      try {
        const freshToken = await sdk.auth.login("customer", "emailpass", {
          email: email.trim().toLowerCase(),
          password: newPassword,
        })
        if (typeof freshToken === "string" && freshToken) {
          await setAuthToken(freshToken)
        }
      } catch {
        // Current session remains valid if refresh fails
      }
    }

    return {
      success: true,
      message: data.message || "Your password has been changed successfully.",
    }
  } catch (err: any) {
    console.error("changeCustomerPassword error:", err?.message || err)
    return {
      success: false,
      error: "Network error occurred while changing password. Please try again.",
    }
  }
}
