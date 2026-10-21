/**
 * Resilient fetch wrapper with a strict timeout to prevent undici HeadersTimeoutError
 * and build-time hangs on Vercel.
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs = 4000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Fetch timed out after ${timeoutMs}ms for ${input.toString()}`))
  }, timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal || controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
