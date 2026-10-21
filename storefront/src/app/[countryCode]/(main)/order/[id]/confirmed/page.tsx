import { retrieveOrder } from "@lib/data/orders"
import { retrieveCustomer } from "@lib/data/customer"
import { getWebinars } from "@lib/data/webinars"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string; countryCode: string }>
}

export const metadata: Metadata = {
  title: "Enrollment Confirmed | AcademyIO",
  description: "Your webinar registration, receipt, and CPE learning credentials have been confirmed.",
}

export default async function OrderConfirmedPage(props: Props) {
  const { id, countryCode } = await props.params
  const order = await retrieveOrder(id).catch(() => null)

  if (!order) {
    return notFound()
  }

  const [customer, { webinars = [] }] = await Promise.all([
    retrieveCustomer().catch(() => null),
    getWebinars({ limit: 100 }).catch(() => ({ webinars: [] })),
  ])

  return (
    <OrderCompletedTemplate
      order={order}
      countryCode={countryCode || "us"}
      customer={customer}
      webinars={webinars}
    />
  )
}
