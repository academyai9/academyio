import React, { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { sanitizeRedirectPath } from "@lib/util/safe-redirect"
import UnifiedAuthView from "@components/auth/UnifiedAuthView"

export const metadata: Metadata = {
  title: "Create Account | AcademyIO",
  robots: { index: false, follow: false },
}

type RegisterPageProps = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RegisterPage(props: RegisterPageProps) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const rawReturnUrl = (searchParams?.returnUrl as string) || (searchParams?.redirect as string) || ""

  // When already logged in, redirect to validated safe path or account dashboard
  const customer = await retrieveCustomer().catch(() => null)
  if (customer) {
    const safeTarget = sanitizeRedirectPath(rawReturnUrl, `/${countryCode}/account`)
    redirect(safeTarget)
  }

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
