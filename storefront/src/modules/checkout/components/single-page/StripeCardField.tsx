"use client"

import React, { useContext, useEffect } from "react"
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import { useTheme } from "@/components/theme/ThemeProvider"

interface StripeCardFieldProps {
  onConfirmReady?: (
    confirmFn: (
      clientSecret: string,
      billingDetails: any
    ) => Promise<{ error?: any; paymentIntent?: any }>
  ) => void
}

function StripeElementsInner({ onConfirmReady }: StripeCardFieldProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  useEffect(() => {
    if (onConfirmReady && stripe && elements) {
      onConfirmReady(async (clientSecret: string, billingDetails: any) => {
        const card = elements.getElement(CardElement) || elements.getElement("card")
        if (!card) {
          throw new Error("Credit card details not found. Please enter your card number, expiry, and CVC.")
        }
        return await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card,
            billing_details: billingDetails,
          },
        })
      })
    }
  }, [stripe, elements, onConfirmReady])

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
      <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">
        Card Details (Encrypted by Stripe)
      </label>
      <div className="p-3.5 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700">
        <CardElement
          key={isDark ? "dark" : "light"}
          options={{
            style: {
              base: {
                fontSize: "14px",
                color: isDark ? "#f8fafc" : "#1e293b",
                fontFamily: "system-ui, -apple-system, sans-serif",
                "::placeholder": {
                  color: isDark ? "#94a3b8" : "#64748b",
                },
              },
              invalid: {
                color: "#ef4444",
              },
            },
          }}
        />
      </div>
    </div>
  )
}

export default function StripeCardField({ onConfirmReady }: StripeCardFieldProps) {
  const isStripe = useContext(StripeContext)
  if (!isStripe) {
    return (
      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
        Direct electronic card processing active.
      </div>
    )
  }
  return <StripeElementsInner onConfirmReady={onConfirmReady} />
}
