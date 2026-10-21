import React, { useEffect } from "react"

export default function CustomerDirectoryRedirectPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/webapp/customers")
    }
  }, [])

  return (
    <div className="p-12 text-center">
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Redirecting to Customer Management...
      </p>
    </div>
  )
}
