"use client"

import React, { useContext, useEffect } from "react"
import { loadStripe, Stripe } from "@stripe/stripe-js"
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import { useTheme } from "@/components/theme/ThemeProvider"
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react"

interface StripeCardFieldProps {
  clientSecret?: string | null
  isLoading?: boolean
  error?: string | null
  onConfirmReady?: (
    confirmFn: (
      clientSecret: string,
      billingDetails: any
    ) => Promise<{ error?: any; paymentIntent?: any }>
  ) => void
}

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY

const stripePromise: Promise<Stripe | null> | null = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null

function StripeElementsInner({ onConfirmReady }: { onConfirmReady?: StripeCardFieldProps["onConfirmReady"] }) {
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
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200">
          Card Details (Encrypted by Stripe)
        </label>
        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PCI-DSS Level 1 Encrypted</span>
        </div>
      </div>
      <div className="p-3.5 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        <CardElement
          key={isDark ? "dark" : "light"}
          options={{
            hidePostalCode: false,
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
      <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
        Enter your 16-digit card number, expiration date, 3-digit CVC, and postal code.
      </p>
    </div>
  )
}

export default function StripeCardField({
  clientSecret,
  isLoading = false,
  error = null,
  onConfirmReady,
}: StripeCardFieldProps) {
  const outerStripeContext = useContext(StripeContext)

  // 1. If an outer Elements provider is already active, use it directly
  if (outerStripeContext) {
    return <StripeElementsInner onConfirmReady={onConfirmReady} />
  }

  // 2. Loading state while Stripe session is being created/refreshed
  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center justify-center gap-2 text-xs text-blue-700 dark:text-blue-300">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        <span>Initializing secure Stripe payment gateway...</span>
      </div>
    )
  }

  // 3. Error state if backend payment session failed
  if (error) {
    return (
      <div className="mt-4 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  // 4. Missing publishable key guard
  if (!stripePublishableKey || !stripePromise) {
    return (
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
        Payment gateway publishable key is not configured. Please contact support.
      </div>
    )
  }

  // 5. If clientSecret is ready, wrap with dedicated Elements provider
  if (clientSecret) {
    return (
      <Elements
        key={clientSecret}
        stripe={stripePromise}
        options={{
          clientSecret,
        }}
      >
        <StripeElementsInner onConfirmReady={onConfirmReady} />
      </Elements>
    )
  }

  // 6. Fallback if session is still being retrieved
  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
      <span>Loading card payment fields...</span>
    </div>
  )
}
