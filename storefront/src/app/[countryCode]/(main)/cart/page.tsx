import { redirect } from "next/navigation"
import { retrieveCart } from "@lib/data/cart"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Checkout | AcademyIO",
  description: "Complete your webinar enrollment.",
}

type CartProps = {
  params: Promise<{ countryCode: string }>
}

export default async function Cart(props: CartProps) {
  const { countryCode } = await props.params
  const cart = await retrieveCart().catch(() => null)

  // If cart is empty, redirect to upcoming webinar catalog
  if (!cart || !cart.items || cart.items.length === 0) {
    redirect(`/${countryCode}/webinars/upcoming`)
  }

  // Direct checkout: redirect straight to main checkout page
  redirect(`/${countryCode}/checkout`)
}
