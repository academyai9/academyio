import React, { Suspense } from "react"
import { redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import UnifiedAuthView from "@components/auth/UnifiedAuthView"

type LoginPageProps = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage(props: LoginPageProps) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const returnUrl = (searchParams?.returnUrl as string) || (searchParams?.redirect as string) || ""

  // When already logged in, do not show login page — redirect to returnUrl or account dashboard
  const customer = await retrieveCustomer().catch(() => null)
  if (customer) {
    if (returnUrl) {
      redirect(returnUrl)
    }
    redirect(`/${countryCode}/account`)
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-[88vh] flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <UnifiedAuthView initialMode="login" />
    </Suspense>
  )
}
