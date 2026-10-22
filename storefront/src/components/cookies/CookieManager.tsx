"use client"

import React, { useState, useEffect } from "react"
import CookieConsentBanner from "./CookieConsentBanner"
import CookiePreferencesModal from "./CookiePreferencesModal"

interface CookieManagerProps {
  countryCode?: string
}

export default function CookieManager({ countryCode = "us" }: CookieManagerProps) {
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => {
      setModalOpen(true)
    }

    window.addEventListener("academyio_open_cookie_preferences", handleOpen)
    return () => {
      window.removeEventListener("academyio_open_cookie_preferences", handleOpen)
    }
  }, [])

  return (
    <>
      <CookieConsentBanner countryCode={countryCode} />
      <CookiePreferencesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        countryCode={countryCode}
      />
    </>
  )
}
