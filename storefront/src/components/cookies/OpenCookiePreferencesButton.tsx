"use client"

import React from "react"
import { Sliders } from "lucide-react"
import { openCookiePreferencesModal } from "@lib/util/cookie-consent"

interface OpenCookiePreferencesButtonProps {
  className?: string
  children?: React.ReactNode
  variant?: "button" | "link"
}

export default function OpenCookiePreferencesButton({
  className = "",
  children,
  variant = "button",
}: OpenCookiePreferencesButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openCookiePreferencesModal()
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`text-gray-400 hover:text-white transition-colors cursor-pointer text-left ${className}`}
      >
        {children || "Cookie Preferences"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer ${className}`}
    >
      <Sliders className="w-4 h-4" />
      <span>{children || "Manage Cookie Preferences"}</span>
    </button>
  )
}
