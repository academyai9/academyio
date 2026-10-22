"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { ShieldCheck, RefreshCw, AlertCircle } from "lucide-react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "error-callback"?: (errorCode?: string) => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact" | "flexible"
          retry?: "auto" | "never"
          "refresh-expired"?: "auto" | "manual" | "never"
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: (errorMessage: string) => void
  onExpire?: () => void
  theme?: "light" | "dark" | "auto"
  className?: string
  siteKey?: string
}

// Cloudflare Turnstile sitekey
const DEFAULT_TURNSTILE_SITEKEY = "0x4AAAAAAFgxi8yKtuNeyzZv"

export default function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  className = "",
  siteKey,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [token, setToken] = useState<string>("")
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const activeSiteKey =
    siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEFAULT_TURNSTILE_SITEKEY

  const handleVerify = useCallback(
    (responseToken: string) => {
      setToken(responseToken)
      setHasError(false)
      setErrorMessage(null)
      onVerify(responseToken)
    },
    [onVerify]
  )

  const handleExpire = useCallback(() => {
    setToken("")
    if (onExpire) {
      onExpire()
    }
  }, [onExpire])

  const handleError = useCallback(
    (errorCode?: string) => {
      setToken("")
      setHasError(true)
      const msg = "Security check could not be completed. Please click refresh."
      setErrorMessage(msg)
      if (onError) {
        onError(errorCode ? `${msg} (${errorCode})` : msg)
      }
    },
    [onError]
  )

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return

    // If widget already rendered, reset or remove first
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch {}
      widgetIdRef.current = null
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: activeSiteKey,
        theme: theme,
        size: "normal",
        callback: handleVerify,
        "error-callback": handleError,
        "expired-callback": handleExpire,
        "refresh-expired": "auto",
      })
      widgetIdRef.current = id
      setIsLoaded(true)
    } catch (e: any) {
      console.warn("Turnstile render error:", e)
      handleError()
    }
  }, [activeSiteKey, theme, handleVerify, handleError, handleExpire])

  const handleManualReset = () => {
    setToken("")
    setHasError(false)
    setErrorMessage(null)
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
        return
      } catch {}
    }
    renderWidget()
  }

  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null
    let isSubscribed = true

    const tryRender = () => {
      if (!isSubscribed) return
      if (typeof window !== "undefined" && window.turnstile && typeof window.turnstile.render === "function") {
        renderWidget()
        return true
      }
      return false
    }

    // If Turnstile script is already loaded and ready
    if (tryRender()) {
      return
    }

    window.onloadTurnstileCallback = () => {
      if (isSubscribed) {
        renderWidget()
      }
    }

    const scriptId = "cf-turnstile-script"
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement("script")
      script.id = scriptId
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit"
      script.async = true
      script.defer = true

      script.onload = () => {
        tryRender()
      }

      script.onerror = () => {
        if (isSubscribed) {
          setHasError(true)
          setErrorMessage("Failed to load security verification. Please check your network or ad blocker.")
        }
      }

      document.head.appendChild(script)
    }

    // Polling fallback to guarantee rendering once script evaluates
    let attempts = 0
    checkInterval = setInterval(() => {
      attempts++
      if (tryRender() || attempts > 50) {
        if (checkInterval) clearInterval(checkInterval)
      }
    }, 150)

    return () => {
      isSubscribed = false
      if (checkInterval) clearInterval(checkInterval)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }
  }, [renderWidget])

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/60 p-3.5 transition-all ${className}`}
      data-testid="turnstile-container"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Security Verification</span>
        </div>
        <div className="flex items-center gap-2">
          {token && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Verified ✓
            </span>
          )}
          <button
            type="button"
            onClick={handleManualReset}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1 rounded hover:bg-gray-200/50 dark:hover:bg-slate-800 cursor-pointer"
            title="Refresh verification challenge"
            aria-label="Refresh security challenge"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2.5">
        Please complete the security check to confirm you are a human participant.
      </p>

      {/* Widget container */}
      <div className="flex justify-center items-center min-h-[65px] w-full">
        <div ref={containerRef} className="cf-turnstile-wrapper my-1" />
      </div>

      {/* Loading state before widget draws */}
      {!isLoaded && !hasError && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400 dark:text-slate-500 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Loading security check...</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage || "Verification challenge could not load."}</span>
          </div>
          <button
            type="button"
            onClick={handleManualReset}
            className="underline text-xs font-semibold hover:text-red-900 dark:hover:text-red-200 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Hidden input for progressive enhancement & native form submission */}
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <input type="hidden" name="captcha_token" value={token} />
    </div>
  )
}
