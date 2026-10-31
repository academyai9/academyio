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
import { Pool } from "pg"
import { verifyTurnstileToken } from "@lib/util/verify-turnstile"
import { fetchWithTimeout } from "@lib/util/fetch"

const DB_CONNECTION_STRING =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_eVfLTi3pF5CE@ep-calm-meadow-b4nc559a-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

const pool = new Pool({
  connectionString: DB_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 4000,
  idleTimeoutMillis: 10000,
  max: 5,
})

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

  // 3. Pre-check for Duplicate Email and Account Claiming Eligibility
  let existingCustomerId: string | null = null
  let existingHasAuth = false

  try {
    const client = await pool.connect()
    try {
      // Clean up any dangling orphaned identities with no customer or user attached
      await client.query(
        `DELETE FROM provider_identity 
         WHERE auth_identity_id IN (
           SELECT id FROM auth_identity 
           WHERE app_metadata IS NULL OR (app_metadata->>'customer_id' IS NULL AND app_metadata->>'user_id' IS NULL)
         ) AND LOWER(entity_id) = LOWER($1)`,
        [customerForm.email]
      )
      await client.query(
        `DELETE FROM auth_identity 
         WHERE (app_metadata IS NULL OR (app_metadata->>'customer_id' IS NULL AND app_metadata->>'user_id' IS NULL))
           AND id NOT IN (SELECT auth_identity_id FROM provider_identity WHERE auth_identity_id IS NOT NULL)`
      )

      // Check if customer exists and whether they already have an active auth identity
      const existingRes = await client.query(
        `SELECT c.id, c.email, ai.id AS auth_id
         FROM customer c
         LEFT JOIN auth_identity ai ON (ai.app_metadata->>'customer_id' = c.id AND ai.deleted_at IS NULL)
         WHERE LOWER(c.email) = LOWER($1) AND c.deleted_at IS NULL
         LIMIT 1`,
        [customerForm.email]
      )
      if (existingRes.rows.length > 0) {
        existingCustomerId = existingRes.rows[0].id
        existingHasAuth = Boolean(existingRes.rows[0].auth_id)
      }
    } finally {
      client.release()
    }
  } catch (dbErr) {
    console.warn("Notice: duplicate email pre-check query:", dbErr)
  }

  // If customer already has a full account with auth credentials, direct them to sign in
  if (existingCustomerId && existingHasAuth) {
    return "An account with this email address already exists. Please sign in instead."
  }

  // If customer was created via guest checkout (exists in customer table, but has no auth identity yet),
  // allow them to claim their account and set their password!
  if (existingCustomerId && !existingHasAuth) {
    try {
      const token = await sdk.auth.register("customer", "emailpass", {
        email: customerForm.email,
        password: password,
        captcha_token: captchaToken,
      } as any)

      let authIdentityId: string | null = null
      if (typeof token === "string") {
        try {
          const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString())
          authIdentityId = payload.auth_identity_id || null
        } catch (_) {}
      }

      const client = await pool.connect()
      try {
        if (!authIdentityId) {
          const piRes = await client.query(
            `SELECT ai.id FROM provider_identity pi
             JOIN auth_identity ai ON ai.id = pi.auth_identity_id
             WHERE LOWER(pi.entity_id) = LOWER($1) AND pi.provider = 'emailpass' AND pi.deleted_at IS NULL
             LIMIT 1`,
            [customerForm.email]
          )
          if (piRes.rows.length > 0) {
            authIdentityId = piRes.rows[0].id
          }
        }

        if (authIdentityId) {
          await client.query(
            `UPDATE auth_identity 
             SET app_metadata = jsonb_set(COALESCE(app_metadata, '{}'::jsonb), '{customer_id}', to_jsonb($1::text)),
                 updated_at = NOW()
             WHERE id = $2`,
            [existingCustomerId, authIdentityId]
          )
        }

        await client.query(
          `UPDATE customer
           SET first_name = COALESCE(NULLIF($1, ''), first_name),
               last_name = COALESCE(NULLIF($2, ''), last_name),
               phone = COALESCE(NULLIF($3, ''), phone),
               company_name = COALESCE(NULLIF($4, ''), company_name),
               metadata = COALESCE($5::jsonb, metadata),
               has_account = true,
               updated_at = NOW()
           WHERE id = $6`,
          [
            customerForm.first_name || null,
            customerForm.last_name || null,
            customerForm.phone || null,
            customerForm.company_name || null,
            customerForm.metadata ? JSON.stringify(customerForm.metadata) : null,
            existingCustomerId,
          ]
        )
      } finally {
        client.release()
      }

      const loginToken = await sdk.auth.login("customer", "emailpass", {
        email: customerForm.email,
        password,
      })

      await setAuthToken(loginToken as string)

      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)

      await transferCart()

      return { id: existingCustomerId, email: customerForm.email }
    } catch (claimErr: any) {
      console.error("Account claiming error:", claimErr)
      const msg = claimErr?.message || claimErr?.toString() || ""
      if (msg.includes("Identity with email already exists") || msg.includes("already exists")) {
        return "An account with this email address already exists. Please sign in instead."
      }
      return msg || "Failed to set up account. Please try again."
    }
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
      captcha_token: captchaToken,
    } as any)

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    // Explicitly update metadata and additional fields with authenticated session token
    const authHeaders = {
      ...(await getAuthHeaders()),
    }
    await sdk.store.customer
      .update(
        {
          company_name: customerForm.company_name,
          phone: customerForm.phone,
          metadata: customerForm.metadata,
        },
        {},
        authHeaders
      )
      .catch((e) => console.warn("Notice: customer metadata saved via create payload:", e))

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()

    return createdCustomer
  } catch (error: any) {
    const msg = error?.message || error?.toString() || ""
    if (msg.includes("Identity with email already exists") || msg.includes("already exists")) {
      return "An account with this email address already exists. Please sign in instead."
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

  // 1. Optional check if account is suspended or inactive (isolated & non-blocking)
  try {
    const client = await pool.connect()
    try {
      const statusCheck = await client.query(
        `SELECT metadata->>'account_status' as status FROM customer WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
        [email]
      )
      const accStatus = statusCheck.rows[0]?.status
      if (accStatus === "inactive" || accStatus === "suspended") {
        return `Your account has been ${accStatus}. Please contact AcademyIO Support at support@academyio.com for assistance.`
      }
    } finally {
      client.release()
    }
  } catch (statusErr) {
    console.warn("Notice: optional account status check skipped:", statusErr)
  }

  // 2. Core Authentication with Medusa Backend
  let token: string | null = null
  try {
    token = (await sdk.auth.login("customer", "emailpass", { email, password })) as string
  } catch (error: any) {
    console.warn("Login auth error response:", error?.message || error)
    const msg = error?.message || error?.toString() || ""

    // Optional check: if customer exists from guest checkout but has no password created yet
    try {
      const client = await pool.connect()
      try {
        const guestCheck = await client.query(
          `SELECT c.id FROM customer c
           LEFT JOIN auth_identity ai ON (ai.app_metadata->>'customer_id' = c.id AND ai.deleted_at IS NULL)
           WHERE LOWER(c.email) = LOWER($1) AND c.deleted_at IS NULL AND ai.id IS NULL
           LIMIT 1`,
          [email]
        )
        if (guestCheck.rows.length > 0) {
          return "An account was found for your past webinar purchases, but no password has been created yet. Please click 'Register' to set your password and access your customer dashboard."
        }
      } finally {
        client.release()
      }
    } catch (e) {
      // Safe fallback
    }

    if (
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("invalid") ||
      msg.toLowerCase().includes("credential") ||
      msg.toLowerCase().includes("401") ||
      msg.includes("Identity with email")
    ) {
      return "Invalid email or password. Please verify your credentials and try again."
    }

    if (msg.includes("timeout") || msg.includes("Timeout") || msg.includes("fetch failed")) {
      return "Authentication service is warming up. Please try again in a few seconds."
    }

    return "Invalid email or password. Please check your credentials and try again."
  }

  if (!token) {
    return "Unable to log in. Please verify your credentials."
  }

  // 3. Set Auth Cookie & Invalidate Cache Tags
  await setAuthToken(token)
  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  // 4. Record last login timestamp (safe & non-blocking)
  try {
    const logClient = await pool.connect()
    try {
      await logClient.query(
        `UPDATE customer 
         SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{last_login_at}', to_jsonb(NOW()::text)),
             updated_at = NOW()
         WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
        [email]
      )
    } finally {
      logClient.release()
    }
  } catch (err) {
    console.warn("Notice: could not record last_login_at:", err)
  }

  // 5. Transfer Cart if applicable
  try {
    await transferCart()
  } catch (cartError) {
    console.warn("Notice: Cart transfer during login skipped:", cartError)
  }

  return null
}

export async function signout(countryCode: string, redirectTo?: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect(redirectTo || `/${countryCode}/login?logged_out=true`)
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
  } catch (error) {
    console.warn("Notice: Stale cart cleared during cart transfer:", error)
    await removeCartId()
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
      message: data.message,
      is_guest: data.is_guest || false,
      has_account: data.has_account !== false,
      reset_token: data.reset_token || null,
      reset_link: data.reset_link || null,
      expires_at: data.expires_at || null,
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
