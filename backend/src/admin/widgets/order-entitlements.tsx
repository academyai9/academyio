import React, { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { AcademicCap, CheckCircle, DocumentText, ArrowPath } from "@medusajs/icons"

interface OrderEntitlementWidgetProps {
  data: {
    id: string
    display_id?: number
    customer_id?: string
    email?: string
    metadata?: Record<string, any>
  }
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default function OrderEntitlementsWidget({ data: order }: OrderEntitlementWidgetProps) {
  const [entitlements, setEntitlements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntitlements = async () => {
    if (!order?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/admin/entitlements?order_id=${order.id}`, {
        credentials: "include",
      })
      if (!res.ok) {
        // Fallback: try querying by customer email
        const fallbackRes = await fetch(
          `/admin/entitlements?customer_email=${encodeURIComponent(order.email || "")}`,
          { credentials: "include" }
        )
        const fallbackData = await fallbackRes.json()
        setEntitlements(fallbackData.entitlements || [])
        return
      }
      const json = await res.json()
      setEntitlements(json.entitlements || [])
    } catch (err: any) {
      setError("Could not load webinar entitlements for this order.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntitlements()
  }, [order?.id])

  if (!loading && entitlements.length === 0) {
    return null // Only render if this order contains webinar entitlements
  }

  return (
    <Container className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-4 my-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <AcademicCap className="w-5 h-5" />
          </div>
          <div>
            <Heading level="h2" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Webinar Entitlements & Digital Access
            </Heading>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
              Authorized learning materials and session permissions granted to {order.email}
            </Text>
          </div>
        </div>
        <Button variant="secondary" size="small" onClick={fetchEntitlements} disabled={loading} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
          <ArrowPath className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">Loading digital entitlements...</div>
      ) : error ? (
        <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-800">{error}</div>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {entitlements.map((ent) => (
            <div key={ent.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="space-y-1">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>{ent.webinar?.title || "Educational Webinar"}</span>
                  <Badge color={ent.status === "active" ? "green" : "grey"}>
                    {ent.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-3">
                  <span>Option: <strong className="text-neutral-700 dark:text-neutral-300">{ent.variant_title || ent.access_type}</strong></span>
                  <span>Granted: {new Date(ent.granted_at).toLocaleDateString()}</span>
                  {ent.expires_at && (
                    <span>Expires: {new Date(ent.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono">
                  Type: {ent.access_type}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Access Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  )
}
