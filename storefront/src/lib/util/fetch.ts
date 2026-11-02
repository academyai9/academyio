/**
 * Resilient fetch wrapper with a strict timeout to prevent undici HeadersTimeoutError
 * and build-time hangs on Vercel.
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs = 5000
): Promise<Response> {
  let finalInput = input
  if (typeof finalInput === "string") {
    if (finalInput.includes("academyio-backend.onrender.com") && !finalInput.includes("-east")) {
      finalInput = finalInput.replace(
        "academyio-backend.onrender.com",
        "academyio-backend-east.onrender.com"
      )
    }
    if (
      (process.env.NODE_ENV === "production" || process.env.VERCEL) &&
      finalInput.startsWith("http://localhost:9000")
    ) {
      finalInput = finalInput.replace(
        "http://localhost:9000",
        "https://academyio-backend-east.onrender.com"
      )
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Fetch timed out after ${timeoutMs}ms for ${finalInput.toString()}`))
  }, timeoutMs)

  try {
    return await fetch(finalInput, {
      ...init,
      signal: init?.signal || controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
