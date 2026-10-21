import React, { useState, useEffect } from "react"
import { Sun, Moon } from "@medusajs/icons"

export function useAdminTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    const persisted = localStorage.getItem("medusa_admin_theme")
    if (persisted === "dark") return true
    if (persisted === "light") return false
    return (
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    )
  })

  useEffect(() => {
    const checkTheme = () => {
      const isHtmlDark = document.documentElement.classList.contains("dark")
      const stored = localStorage.getItem("medusa_admin_theme")
      if (stored === "dark") {
        setIsDark(true)
        if (!isHtmlDark) document.documentElement.classList.add("dark")
      } else if (stored === "light") {
        setIsDark(false)
        if (isHtmlDark) document.documentElement.classList.remove("dark")
      } else {
        setIsDark(isHtmlDark)
      }
    }

    checkTheme()

    // Observe changes to <html> classes or attributes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-mode", "style"],
    })

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "medusa_admin_theme") {
        checkTheme()
      }
    }
    window.addEventListener("storage", handleStorage)

    return () => {
      observer.disconnect()
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    const html = document.documentElement
    if (nextDark) {
      html.classList.add("dark")
      html.classList.remove("light")
      html.setAttribute("data-mode", "dark")
      html.style.colorScheme = "dark"
      localStorage.setItem("medusa_admin_theme", "dark")
    } else {
      html.classList.remove("dark")
      html.classList.add("light")
      html.setAttribute("data-mode", "light")
      html.style.colorScheme = "light"
      localStorage.setItem("medusa_admin_theme", "light")
    }
  }

  return { isDark, toggleTheme }
}

export function AdminThemeToggle({
  isDark: propIsDark,
  toggleTheme: propToggleTheme,
  onToggle,
  className = "",
}: {
  isDark?: boolean
  toggleTheme?: () => void
  onToggle?: () => void
  className?: string
} = {}) {
  const hookTheme = useAdminTheme()
  const isDark = propIsDark !== undefined ? propIsDark : hookTheme.isDark
  const toggleTheme = propToggleTheme || onToggle || hookTheme.toggleTheme

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-700 cursor-pointer ${className}`}
      title={isDark ? "Switch to Day Mode (Light)" : "Switch to Night Mode (Dark)"}
      aria-label={isDark ? "Switch to Day Mode (Light)" : "Switch to Night Mode (Dark)"}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Day Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Night Mode</span>
        </>
      )}
    </button>
  )
}
