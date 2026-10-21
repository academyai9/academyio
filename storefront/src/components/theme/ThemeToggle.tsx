"use client"

import React, { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "./ThemeProvider"

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export default function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        className={`p-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors ${className}`}
        aria-label="Toggle theme"
      >
        <span className="w-4 h-4 block" />
      </button>
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 hover:rotate-90 transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform duration-300" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  )
}
