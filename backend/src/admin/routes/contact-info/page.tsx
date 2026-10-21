import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  MapPin,
  BuildingStorefront,
  Envelope,
  Phone,
  ArrowPath,
  CheckCircle,
  ExclamationCircle,
  XMark,
  ArrowUpRightOnBox,
  InformationCircle,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Company Address & Contact",
  icon: MapPin,
  rank: 64,
})

const getAuthHeaders = () => {
  let token: string | null = null
  if (typeof window !== "undefined") {
    token =
      localStorage.getItem("medusa_auth_token") ||
      localStorage.getItem("_medusa_jwt") ||
      localStorage.getItem("medusa_token")
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface ContactInfoData {
  company_name: string
  street_address: string
  city: string
  state: string
  country: string
  postal_code: string
  formatted_address: string
  support_email: string
  support_phone: string
  support_hours: string
  broadcast_support_note: string
  map_link: string
  is_active: boolean
  updated_at?: string
}

const DEFAULT_STATE: ContactInfoData = {
  company_name: "AcademyIO",
  street_address: "261 Blossom St",
  city: "Dos Palos",
  state: "California",
  country: "United States",
  postal_code: "93620",
  formatted_address: "261 Blossom St, Dos Palos, California, United States - 93620",
  support_email: "support@academyio.com",
  support_phone: "+1 (800) 555-CPE-PASS (toll free)",
  support_hours: "Monday - Friday: 8:00 AM - 6:00 PM EST",
  broadcast_support_note: "Available 30 minutes prior to scheduled start",
  map_link: "https://www.google.com/maps/search/?api=1&query=261+Blossom+St,+Dos+Palos,+California+93620",
  is_active: true,
}

export default function ContactInfoAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [data, setData] = useState<ContactInfoData>(DEFAULT_STATE)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const fetchContactInfo = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/contact-info", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load company contact details")
      const json = await res.json()
      if (json.contact_info) {
        setData({
          company_name: json.contact_info.company_name || DEFAULT_STATE.company_name,
          street_address: json.contact_info.street_address || DEFAULT_STATE.street_address,
          city: json.contact_info.city || DEFAULT_STATE.city,
          state: json.contact_info.state || DEFAULT_STATE.state,
          country: json.contact_info.country || DEFAULT_STATE.country,
          postal_code: json.contact_info.postal_code || DEFAULT_STATE.postal_code,
          formatted_address: json.contact_info.formatted_address || DEFAULT_STATE.formatted_address,
          support_email: json.contact_info.support_email || DEFAULT_STATE.support_email,
          support_phone: json.contact_info.support_phone || DEFAULT_STATE.support_phone,
          support_hours: json.contact_info.support_hours || DEFAULT_STATE.support_hours,
          broadcast_support_note: json.contact_info.broadcast_support_note || DEFAULT_STATE.broadcast_support_note,
          map_link: json.contact_info.map_link || DEFAULT_STATE.map_link,
          is_active: json.contact_info.is_active !== undefined ? Boolean(json.contact_info.is_active) : true,
          updated_at: json.contact_info.updated_at,
        })
      }
    } catch (e: any) {
      notify("error", e.message || "Failed to load contact info")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContactInfo()
  }, [])

  const handleAutoFormat = () => {
    const formatted = `${data.street_address}, ${data.city}, ${data.state}, ${data.country} - ${data.postal_code}`
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${data.street_address}, ${data.city}, ${data.state} ${data.postal_code}`
    )}`
    setData((prev) => ({
      ...prev,
      formatted_address: formatted,
      map_link: mapUrl,
    }))
    notify("success", "Address auto-formatted and map direction link generated.")
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!data.street_address.trim() || !data.city.trim() || !data.country.trim()) {
      notify("error", "Street address, City, and Country are required.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/admin/contact-info", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to update contact info")
      }

      const json = await res.json()
      if (json.contact_info) {
        setData((prev) => ({
          ...prev,
          ...json.contact_info,
        }))
      }
      notify("success", "Company address and contact details saved successfully!")
    } catch (e: any) {
      notify("error", e.message || "Failed to save address details")
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    setSaving(true)
    try {
      const res = await fetch("/admin/contact-info", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ reset_to_default: true }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to reset to default")
      }

      const json = await res.json()
      if (json.contact_info) {
        setData({
          ...DEFAULT_STATE,
          ...json.contact_info,
        })
      }
      notify("success", "Reset to official company address successfully.")
      setResetConfirmOpen(false)
    } catch (e: any) {
      notify("error", e.message || "Failed to reset address")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h1" className="text-2xl font-bold">
                  Company Address & Contact Information
                </Heading>
                <Badge color={data.is_active ? "green" : "grey"} size="small">
                  {data.is_active ? "Live on Website" : "Hidden"}
                </Badge>
              </div>
              <Text className="text-ui-fg-subtle text-xs mt-0.5">
                Manage the official headquarters address, advisory phone, support email, and service hours displayed on the Contact Us page.
              </Text>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          <a
            href="http://localhost:8000/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-subtle transition-colors flex items-center gap-1.5"
            title="Open customer Contact Us page in new tab"
          >
            <span>Live Contact Page</span>
            <ArrowUpRightOnBox className="w-3.5 h-3.5" />
          </a>
          <Button
            variant="secondary"
            onClick={fetchContactInfo}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            {saving ? <ArrowPath className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </Button>
        </div>
      </div>

      {/* Cross Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-ui-border-base pb-3 text-xs font-semibold overflow-x-auto">
        <a
          href="/webapp/promotions"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Promotions & Banners
        </a>
        <a
          href="/webapp/organizations"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Regulatory Bodies
        </a>
        <a
          href="/webapp/credits"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Credits Management
        </a>
        <a
          href="/webapp/other-info"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Other Information
        </a>
        <span className="text-blue-600 border-b-2 border-blue-600 pb-2 px-3">
          Company Address & Contact
        </span>
        <a
          href="/webapp/social-media"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Social Media
        </a>
        <a
          href="/webapp/testimonials"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Testimonials
        </a>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form on Left (7 cols), Live Preview on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Controls Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Physical Address */}
          <div className="rounded-2xl border border-ui-border-base p-6 bg-ui-bg-base space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <div className="flex items-center gap-2 text-ui-fg-base">
                <BuildingStorefront className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-sm">Physical Headquarters Address</h2>
              </div>
              <button
                type="button"
                onClick={handleAutoFormat}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg transition-colors"
              >
                Auto-Format String
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-ui-fg-base block mb-1">Company / Organization Legal Name</label>
                <input
                  type="text"
                  value={data.company_name}
                  onChange={(e) => setData({ ...data, company_name: e.target.value })}
                  placeholder="AcademyIO"
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">
                  Street Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={data.street_address}
                  onChange={(e) => setData({ ...data, street_address: e.target.value })}
                  placeholder="261 Blossom St"
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={data.city}
                    onChange={(e) => setData({ ...data, city: e.target.value })}
                    placeholder="Dos Palos"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    State / Province / Region <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={data.state}
                    onChange={(e) => setData({ ...data, state: e.target.value })}
                    placeholder="California"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={data.country}
                    onChange={(e) => setData({ ...data, country: e.target.value })}
                    placeholder="United States"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Postal / ZIP Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={data.postal_code}
                    onChange={(e) => setData({ ...data, postal_code: e.target.value })}
                    placeholder="93620"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">
                  Formatted Address (Displayed across site)
                </label>
                <textarea
                  rows={2}
                  value={data.formatted_address}
                  onChange={(e) => setData({ ...data, formatted_address: e.target.value })}
                  placeholder="261 Blossom St, Dos Palos, California, United States - 93620"
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500 font-medium"
                />
                <span className="text-[11px] text-ui-fg-subtle mt-0.5 block">
                  Displayed as the official corporate address on the Contact Us page and footer documents.
                </span>
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">Google Maps / Directions URL</label>
                <input
                  type="text"
                  value={data.map_link}
                  onChange={(e) => setData({ ...data, map_link: e.target.value })}
                  placeholder="https://www.google.com/maps/search/?api=1&query=..."
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Support Channels */}
          <div className="rounded-2xl border border-ui-border-base p-6 bg-ui-bg-base space-y-5 shadow-xs">
            <div className="flex items-center gap-2 border-b border-ui-border-base pb-3 text-ui-fg-base">
              <Phone className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-sm">Customer Advisory & Communications</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Support Email Address</label>
                  <input
                    type="email"
                    value={data.support_email}
                    onChange={(e) => setData({ ...data, support_email: e.target.value })}
                    placeholder="support@academyio.com"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Customer Phone Number</label>
                  <input
                    type="text"
                    value={data.support_phone}
                    onChange={(e) => setData({ ...data, support_phone: e.target.value })}
                    placeholder="+1 (800) 555-CPE-PASS (toll free)"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">Advisory Service Hours</label>
                <input
                  type="text"
                  value={data.support_hours}
                  onChange={(e) => setData({ ...data, support_hours: e.target.value })}
                  placeholder="Monday - Friday: 8:00 AM - 6:00 PM EST"
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">Live Broadcast Support Note</label>
                <input
                  type="text"
                  value={data.broadcast_support_note}
                  onChange={(e) => setData({ ...data, broadcast_support_note: e.target.value })}
                  placeholder="Available 30 minutes prior to scheduled start"
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Publishing Switch & Actions */}
          <div className="rounded-2xl border border-ui-border-base p-6 bg-ui-bg-base space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xs text-ui-fg-base">Publish Address on Website</h3>
                <p className="text-[11px] text-ui-fg-subtle">
                  Toggle whether this address appears publicly on the storefront Contact page.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.is_active}
                  onChange={(e) => setData({ ...data, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-ui-border-base flex items-center justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setResetConfirmOpen(true)}
                disabled={saving}
                className="text-xs text-rose-600 hover:text-rose-700 border-rose-200 dark:border-rose-900"
              >
                Reset to Default
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleSave()}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {saving ? <ArrowPath className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>{saving ? "Saving Changes..." : "Save Address Settings"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-ui-border-base p-6 bg-gradient-to-br from-ui-bg-base to-ui-bg-subtle/50 space-y-4 shadow-sm sticky top-6">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-ui-fg-subtle">
                  Live Storefront Preview
                </h3>
              </div>
              <Badge color="blue" size="small">
                Real-Time
              </Badge>
            </div>

            <p className="text-[11px] text-ui-fg-subtle">
              Here is how customers will see your corporate address and contact info on the website:
            </p>

            {/* Address Card Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-3 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-blue-600">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">Corporate Headquarters</h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Official
                </span>
              </div>

              <div className="text-xs text-gray-700 dark:text-slate-300 font-medium space-y-0.5 pl-1 leading-relaxed">
                <p className="font-bold text-gray-900 dark:text-white">{data.street_address}</p>
                <p>{data.city}, {data.state}</p>
                <p>{data.country} - {data.postal_code}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <a
                  href={data.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Get Directions</span>
                  <ArrowUpRightOnBox className="w-3 h-3" />
                </a>
                <span className="text-gray-400">Merced County, CA</span>
              </div>
            </div>

            {/* Support Email Card Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2.5 text-blue-600">
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                  <Envelope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-xs">Direct Support Email</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-400 pl-1">{data.support_email}</p>
              <p className="text-[10px] text-gray-400 pl-1">Response time: within 2 hours during business hours</p>
            </div>

            {/* Advisory Phone Card Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2.5 text-blue-600">
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-xs">Customer Advisory Phone</h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-slate-400 pl-1 font-mono">{data.support_phone}</p>
              <p className="text-[10px] text-gray-400 pl-1">{data.support_hours}</p>
            </div>

            {/* Info Notice */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 flex items-start gap-2.5 text-[11px] text-blue-800 dark:text-blue-300">
              <InformationCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Automatic Storefront Sync:</strong> Changes saved here are instantly propagated to the storefront API and reflected immediately on the public Contact Us page.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset to Default */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ExclamationCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ui-fg-base">Reset Company Address?</h3>
            </div>
            <p className="text-xs text-ui-fg-subtle leading-relaxed">
              Are you sure you want to restore the official address to:
              <br />
              <strong className="text-ui-fg-base block mt-2 font-mono p-2 rounded-lg bg-ui-bg-subtle border border-ui-border-base">
                261 Blossom St,
                <br />
                Dos Palos, California
                <br />
                United States - 93620
              </strong>
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setResetConfirmOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleResetToDefault}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {saving ? "Resetting..." : "Confirm Reset"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
