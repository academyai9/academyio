import React, { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { BellAlert, CheckCircle, ExclamationCircle, ArrowPath } from "@medusajs/icons"

interface OrderMonitoringWidgetProps {
  data: {
    id: string
    display_id?: number
    email?: string
  }
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default function OrderMonitoringWidget({ data: order }: OrderMonitoringWidgetProps) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOrderMonitoring = async () => {
    if (!order?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/admin/orders-management/${order.id}`, {
        credentials: "include",
      })
      if (res.ok) {
        const json = await res.json()
        setIncidents(json.order?.incidents || [])
      }
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderMonitoring()
  }, [order?.id])

  if (!loading && incidents.length === 0) {
    return null // Only render if there are monitoring incidents or alerts linked to this order
  }

  return (
    <Container className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4 my-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl">
            <BellAlert className="w-5 h-5" />
          </div>
          <div>
            <Heading level="h2" className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Order Monitoring Alert Flagged
            </Heading>
            <Text className="text-[11px] text-amber-700 dark:text-amber-300">
              This order has {incidents.length} active reconciliation incident(s) flagged by the automated monitoring system.
            </Text>
          </div>
        </div>

        <a
          href="/webapp/order-monitoring"
          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          Open Order Monitoring →
        </a>
      </div>

      <div className="space-y-2 text-xs">
        {incidents.map((inc: any) => (
          <div key={inc.id} className="p-3 bg-white/60 dark:bg-neutral-900/60 rounded-xl border border-amber-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 dark:text-amber-100 uppercase text-[10px]">
                {inc.incident_type?.replace(/_/g, " ")}
              </span>
              <Badge color="orange" size="small">{inc.status}</Badge>
            </div>
            <p className="text-amber-800 dark:text-amber-200">{inc.description}</p>
          </div>
        ))}
      </div>
    </Container>
  )
}
