import React from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getWebinars } from "@lib/data/webinars"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import SinglePageCheckoutView from "@modules/checkout/components/single-page/SinglePageCheckoutView"
import { isStripeLike } from "@lib/constants"

export const metadata: Metadata = {
  title: "Single-Page Checkout | AcademyIO",
  description: "Complete your webinar enrollment and access your learning materials.",
}

type CheckoutPageProps = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Checkout(props: CheckoutPageProps) {
  const { countryCode } = await props.params

  // 1. Mandatory Login Guard: Unauthenticated visitors must register or login before checkout
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect(`/${countryCode}/register?returnUrl=/${countryCode}/checkout`)
  }

  // 2. Cart Verification: Cart must exist and have at least 1 item
  let cart = await retrieveCart()
  if (!cart || !cart.items || cart.items.length === 0) {
    redirect(`/${countryCode}/webinars/upcoming`)
  }

  // 3. Auto-Prepare Cart for Instant Digital Fulfillment
  try {
    const headers = { ...(await getAuthHeaders()) }

    // Ensure cart email & digital billing/shipping addresses are linked to customer
    if (!cart.email || !cart.shipping_address) {
      const defaultDigitalAddress = {
        first_name: customer.first_name || "Valued",
        last_name: customer.last_name || "Professional",
        address_1: "Digital Delivery",
        address_2: "",
        city: "New York",
        province: "NY",
        postal_code: "10001",
        country_code: countryCode.toLowerCase() || "us",
        phone: customer.phone || "555-0100",
        company: customer.company_name || "",
      }

      const res = await sdk.store.cart
        .update(
          cart.id,
          {
            email: customer.email,
            shipping_address: defaultDigitalAddress,
            billing_address: defaultDigitalAddress,
          },
          {},
          headers
        )
        .catch(() => null)
      if (res?.cart) cart = res.cart
    }

    // Ensure digital shipping method is assigned to cart
    if (!cart.shipping_methods || cart.shipping_methods.length === 0) {
      const shippingOptions = await listCartShippingMethods(cart.id)
      if (shippingOptions && shippingOptions.length > 0) {
        const digitalOption =
          shippingOptions.find(
            (o) =>
              o.name?.toLowerCase().includes("digital") ||
              o.name?.toLowerCase().includes("instant") ||
              o.amount === 0
          ) || shippingOptions[0]
        if (digitalOption) {
          const res = await sdk.store.cart
            .addShippingMethod(
              cart.id,
              { option_id: digitalOption.id },
              {},
              headers
            )
            .catch((err) => {
              console.warn("Notice: addShippingMethod:", err?.message || err)
              return null
            })
          if (res?.cart) cart = res.cart
        }
      }
    }

    // Fetch available payment methods
    const paymentMethods = (await listCartPaymentMethods(cart.region?.id ?? "")) || []

    // Ensure at least one payment session is initiated
    const activeSession = cart.payment_collection?.payment_sessions?.find(
      (s: any) => s.status === "pending" || s.status === "authorized"
    )
    if (!activeSession && paymentMethods.length > 0) {
      const defaultMethod =
        paymentMethods.find((m: any) => isStripeLike(m.id)) ||
        paymentMethods.find((m: any) => m.id === "pp_system_default") ||
        paymentMethods[0]
      if (defaultMethod) {
        const res = await sdk.store.payment
          .initiatePaymentSession(
            cart,
            { provider_id: defaultMethod.id },
            {},
            headers
          )
          .catch((err) => {
            console.warn("Notice: initiatePaymentSession:", err?.message || err)
            return null
          })
        if (res?.payment_collection) {
          const refreshedCart = await retrieveCart()
          if (refreshedCart) cart = refreshedCart
        }
      }
    }

    // 4. Fetch webinar items for rich order summary details
    const { webinars = [] } = await getWebinars({ limit: 100 })

    return (
      <PaymentWrapper cart={cart}>
        <SinglePageCheckoutView
          cart={cart}
          customer={customer}
          availablePaymentMethods={paymentMethods}
          countryCode={countryCode}
          webinars={webinars}
        />
      </PaymentWrapper>
    )
  } catch (err) {
    console.error("Error preparing single-page checkout:", err)
    // Fallback: render view with current cart state
    const paymentMethods = (await listCartPaymentMethods(cart.region?.id ?? "")) || []
    const { webinars = [] } = await getWebinars({ limit: 100 })

    return (
      <PaymentWrapper cart={cart}>
        <SinglePageCheckoutView
          cart={cart}
          customer={customer}
          availablePaymentMethods={paymentMethods}
          countryCode={countryCode}
          webinars={webinars}
        />
      </PaymentWrapper>
    )
  }
}
