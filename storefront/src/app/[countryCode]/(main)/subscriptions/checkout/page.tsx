import React from "react"
import { notFound, redirect } from "next/navigation"
import { getSubscriptionPlans } from "@lib/data/webinars"
import { retrieveCustomer } from "@lib/data/customer"
import { getAuthHeaders } from "@lib/data/cookies"
import { listActivePaymentMethodConfigs } from "@lib/data/payment"
import SubscriptionCheckoutView from "@/components/subscriptions/SubscriptionCheckoutView"

export const metadata = {
  title: "Subscription Checkout | AcademyIO",
  description: "Securely enroll in our professional monthly webinar subscription.",
}

export default async function SubscriptionCheckoutPage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ plan_id?: string }>
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const planId = searchParams.plan_id

  const [plans, customer, authHeaders, activePaymentMethods] = await Promise.all([
    getSubscriptionPlans(),
    retrieveCustomer(),
    getAuthHeaders(),
    listActivePaymentMethodConfigs(),
  ])

  if (!plans || plans.length === 0) {
    notFound()
  }

  const selectedPlan = plans.find((p) => p.id === planId) || plans[0]
  const token = (authHeaders as any)?.authorization?.replace("Bearer ", "") || ""

  return (
    <SubscriptionCheckoutView
      plan={selectedPlan}
      plans={plans}
      customer={customer}
      authToken={token}
      countryCode={countryCode}
      activePaymentMethods={activePaymentMethods}
    />
  )
}
