import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"
import { BACKEND_URL, PUBLISHABLE_KEY, DEFAULT_REGION } from "./config-env"

export { BACKEND_URL, PUBLISHABLE_KEY, DEFAULT_REGION }
export const MEDUSA_BACKEND_URL = BACKEND_URL

// Global fetch timeout patch to prevent undici HeadersTimeoutError on Vercel build
if (
  typeof globalThis !== "undefined" &&
  typeof globalThis.fetch === "function" &&
  !(globalThis as any).__fetch_timeout_patched
) {
  const _nativeFetch = globalThis.fetch
  ;(globalThis as any).__fetch_timeout_patched = true

  globalThis.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
    if (init?.signal) {
      return _nativeFetch(input, init)
    }

    const controller = new AbortController()
    const timeoutMs = 25000
    const timeoutId = setTimeout(
      () => controller.abort(new Error("Global fetch timeout (25s)")),
      timeoutMs
    )

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Global fetch promise timeout (26s)")),
        timeoutMs + 1000
      )
    })

    try {
      return await Promise.race([
        _nativeFetch(input, { ...init, signal: controller.signal }),
        timeoutPromise,
      ])
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey:
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
    "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978",
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }

  // Set timeout to prevent undici HeadersTimeoutError / hanging on Vercel build
  const controller = new AbortController()
  const timeoutMs = 8000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("Medusa SDK fetch timeout (8.5s)")),
      timeoutMs + 500
    )
  })

  try {
    const fetchPromise = originalFetch(input, {
      ...init,
      headers: newHeaders,
      signal: init?.signal || controller.signal,
    })
    return (await Promise.race([fetchPromise, timeoutPromise])) as T
  } finally {
    clearTimeout(timeoutId)
  }
}
