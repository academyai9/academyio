export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
        const timeoutMs = 8000
        const timeoutId = setTimeout(
          () => controller.abort(new Error("Global fetch timeout (8s)")),
          timeoutMs
        )

        let promiseTimeoutId: ReturnType<typeof setTimeout> | undefined
        const timeoutPromise = new Promise<never>((_, reject) => {
          promiseTimeoutId = setTimeout(
            () => reject(new Error("Global fetch promise timeout (8.5s)")),
            timeoutMs + 500
          )
        })

        try {
          return await Promise.race([
            _nativeFetch(input, { ...init, signal: controller.signal }),
            timeoutPromise,
          ])
        } finally {
          clearTimeout(timeoutId)
          if (promiseTimeoutId) clearTimeout(promiseTimeoutId)
        }
      }
    }
  }
}
