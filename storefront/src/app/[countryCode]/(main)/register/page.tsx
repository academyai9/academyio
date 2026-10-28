import React, { Suspense } from "react"
import UnifiedAuthView from "@components/auth/UnifiedAuthView"

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[88vh] flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <UnifiedAuthView initialMode="register" />
    </Suspense>
  )
}
