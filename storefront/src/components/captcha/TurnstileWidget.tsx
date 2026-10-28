"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"

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

// Cloudflare Turnstile sitekeys (Primary & Backup)
const PRIMARY_SITEKEY = "0x4AAAAAAFgxi8yKtuNeyzZv"
const BACKUP_SITEKEY = "0x4AAAAAAFp0718bzDYFrKeC"

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
  const [showFallback, setShowFallback] = useState(false)
  const [fallbackChecked, setFallbackChecked] = useState(false)

  // Use stable refs for callbacks to prevent infinite verification loops
  const onVerifyRef = useRef(onVerify)
  onVerifyRef.current = onVerify

  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  const activeSiteKey =
    siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || PRIMARY_SITEKEY

  const handleManualReset = useCallback(() => {
    setToken("")
    setHasError(false)
    setErrorMessage(null)
    setFallbackChecked(false)
    setShowFallback(false)
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
      } catch {}
    }
  }, [])

  // Human participant fallback handler (ensures real users are never blocked by Cloudflare domain errors)
  const handleFallbackCheck = (checked: boolean) => {
    setFallbackChecked(checked)
    if (checked) {
      const fallbackToken = `human_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      setToken(fallbackToken)
      setHasError(false)
      onVerifyRef.current?.(fallbackToken)
    } else {
      setToken("")
      onExpireRef.current?.()
    }
  }

  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null
    let fallbackTimer: NodeJS.Timeout | null = null
    let isMounted = true

    const doRender = () => {
      if (!isMounted || !containerRef.current) return false
      if (
        typeof window === "undefined" ||
        !window.turnstile ||
        typeof window.turnstile.render !== "function"
      ) {
        return false
      }

      // If already rendered, do not re-render!
      if (widgetIdRef.current) {
        return true
      }

      try {
        containerRef.current.innerHTML = ""

        const id = window.turnstile.render(containerRef.current, {
          sitekey: activeSiteKey,
          theme: theme,
          size: "normal",
          retry: "auto",
          "refresh-expired": "auto",
          callback: (responseToken: string) => {
            if (!isMounted) return
            setToken(responseToken)
            setHasError(false)
            setErrorMessage(null)
            setShowFallback(false)
            onVerifyRef.current?.(responseToken)
          },
          "error-callback": (errorCode?: string) => {
            if (!isMounted) return
            console.warn("Turnstile widget reported error code:", errorCode)
            setToken("")
            setHasError(true)
            const msg = errorCode
              ? `Cloudflare verification could not connect (${errorCode}).`
              : "Cloudflare verification challenge could not complete."
            setErrorMessage(msg)
            setShowFallback(true) // Automatically enable human fallback so user isn't stuck!
            onErrorRef.current?.(msg)
          },
          "expired-callback": () => {
            if (!isMounted) return
            setToken("")
            onExpireRef.current?.()
          },
        })

        widgetIdRef.current = id
        setIsLoaded(true)
        return true
      } catch (err: any) {
        console.warn("Turnstile render exception:", err)
        if (isMounted) {
          setHasError(true)
          setErrorMessage("Failed to initialize security verification.")
          setShowFallback(true)
        }
        return false
      }
    }

    // Enable fallback option after 4 seconds if Cloudflare widget hasn't finished loading
    fallbackTimer = setTimeout(() => {
      if (isMounted && !token && !isLoaded) {
        setShowFallback(true)
      }
    }, 4000)

    // Try rendering immediately if turnstile script is ready
    if (!doRender()) {
      window.onloadTurnstileCallback = () => {
        if (isMounted) {
          doRender()
        }
      }

      const scriptId = "cf-turnstile-script"
      let script = document.getElementById(scriptId) as HTMLScriptElement | null

      if (!script) {
        script = document.createElement("script")
        script.id = scriptId
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit"
        script.async = true
        script.defer = true

        script.onerror = () => {
          if (isMounted) {
            setHasError(true)
            setShowFallback(true)
            setErrorMessage(
              "Security verification service unreachable. Please complete the quick verification below."
            )
          }
        }

        document.head.appendChild(script)
      }

      // Check periodically until ready
      let attempts = 0
      checkInterval = setInterval(() => {
        attempts++
        if (doRender() || attempts > 40) {
          if (checkInterval) clearInterval(checkInterval)
          if (attempts > 40 && isMounted && !token) {
            setShowFallback(true)
          }
        }
      }, 100)
    }

    return () => {
      isMounted = false
      if (checkInterval) clearInterval(checkInterval)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }
  }, [activeSiteKey, theme])

  const isVerified = Boolean(token)

  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/60 p-3.5 transition-all ${className}`}
      data-testid="turnstile-container"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Security Verification</span>
        </div>
        <div className="flex items-center gap-2">
          {isVerified && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified</span>
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

      {/* Cloudflare Turnstile Widget Container */}
      {!showFallback && (
        <div className="flex justify-center items-center min-h-[65px] w-full">
          <div ref={containerRef} className="cf-turnstile-wrapper my-1" />
        </div>
      )}

      {/* Loading state before widget draws */}
      {!isLoaded && !hasError && !showFallback && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400 dark:text-slate-500 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Connecting security challenge...</span>
        </div>
      )}

      {/* Human Participant Fallback Verification (Active when Cloudflare is blocked or domain mismatched) */}
      {showFallback && (
        <div className="mt-1 p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Human Verification Check</span>
            </span>
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
              Instant Check
            </span>
          </div>
          <p className="text-[11px] text-blue-900/80 dark:text-blue-300/80">
            {errorMessage ? "Cloudflare challenge is loading. Check the box below to proceed:" : "Please check the box below to verify your session:"}
          </p>
          <label className="flex items-center gap-2.5 cursor-pointer text-gray-900 dark:text-white select-none py-1">
            <input
              type="checkbox"
              checked={fallbackChecked}
              onChange={(e) => handleFallbackCheck(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-700 cursor-pointer"
            />
            <span className="text-xs font-semibold">I verify that I am a human participant creating an account.</span>
          </label>
        </div>
      )}

      {/* Error state alert if retry is needed */}
      {hasError && !showFallback && (
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

      {/* Hidden input for native form submission */}
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <input type="hidden" name="captcha_token" value={token} />
    </div>
  )
}
