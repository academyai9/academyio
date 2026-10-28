import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

// Global fetch timeout patch to protect Next.js page data collection against 300s undici hangs
if (
  typeof globalThis !== "undefined" &&
  typeof globalThis.fetch === "function" &&
  !(globalThis as any).__fetch_timeout_guarded
) {
  const _origFetch = globalThis.fetch
  ;(globalThis as any).__fetch_timeout_guarded = true

  globalThis.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ) {
    if (init?.signal) {
      return _origFetch(input, init)
    }

    const controller = new AbortController()
    const timeoutMs = 8000
    const timeoutId = setTimeout(
      () => controller.abort(new Error("Global fetch timeout (8s)")),
      timeoutMs
    )

    try {
      return await _origFetch(input, {
        ...init,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-mode', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-mode', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors">
        <ThemeProvider>
          <main className="relative">{props.children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
