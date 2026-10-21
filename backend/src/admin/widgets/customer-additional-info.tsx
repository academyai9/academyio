import React, { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import {
  User,
  Buildings,
  Phone,
  DocumentText,
  PencilSquare,
  CheckCircle,
  XMark,
  InformationCircleSolid,
  IdBadge,
  ShieldCheck,
} from "@medusajs/icons"

interface CustomerDetailsWidgetProps {
  data: {
    id: string
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
    company_name?: string
    metadata?: Record<string, any>
    created_at?: string
  }
}

export const config = defineWidgetConfig({
  zone: "customer.details.before",
})

export default function CustomerAdditionalInfoWidget({ data: customer }: CustomerDetailsWidgetProps) {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [form, setForm] = useState({
    ptin: "",
    cfp_id: "",
    company_name: "",
    phone: "",
    license_type: "",
  })

  const loadCustomerDetails = async () => {
    if (!customer?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/admin/customers-directory/${customer.id}`, {
        credentials: "include",
      })
      if (res.ok) {
        const json = await res.json()
        setDetails(json.customer)
        setForm({
          ptin: json.customer?.ptin || "",
          cfp_id: json.customer?.cfp_id || "",
          company_name: json.customer?.company_name || "",
          phone: json.customer?.phone || "",
          license_type: json.customer?.license_type || "CPA",
        })
      } else {
        // Fallback to customer prop data
        const ptin = customer.metadata?.ptin || ""
        const cfp_id = customer.metadata?.cfp_id || ""
        const comp = customer.company_name || customer.metadata?.company_name || ""
        const ph = customer.phone || customer.metadata?.phone || ""
        const lic = customer.metadata?.license_type || (ptin ? "EA" : cfp_id ? "CFP" : "CPA")
        setDetails({
          ...customer,
          ptin,
          cfp_id,
          company_name: comp,
          phone: ph,
          license_type: lic,
        })
        setForm({
          ptin,
          cfp_id,
          company_name: comp,
          phone: ph,
          license_type: lic,
        })
      }
    } catch (err) {
      // Fallback to prop
      const ptin = customer.metadata?.ptin || ""
      const cfp_id = customer.metadata?.cfp_id || ""
      const comp = customer.company_name || customer.metadata?.company_name || ""
      const ph = customer.phone || customer.metadata?.phone || ""
      const lic = customer.metadata?.license_type || "CPA"
      setDetails({
        ...customer,
        ptin,
        cfp_id,
        company_name: comp,
        phone: ph,
        license_type: lic,
      })
      setForm({ ptin, cfp_id, company_name: comp, phone: ph, license_type: lic })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomerDetails()
  }, [customer?.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    // Validate PTIN format if provided: P followed by 8 digits (no spaces)
    if (form.ptin) {
      const cleaned = form.ptin.trim().toUpperCase()
      if (!/^P\d{8}$/.test(cleaned)) {
        setFeedback({
          type: "error",
          message: "PTIN must start with 'P' followed by exactly 8 digits with no spaces (e.g. P12345678).",
        })
        setSaving(false)
        return
      }
    }

    try {
      const res = await fetch(`/admin/customers-directory/${customer.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ptin: form.ptin ? form.ptin.trim().toUpperCase() : null,
          cfp_id: form.cfp_id ? form.cfp_id.trim() : null,
          company_name: form.company_name ? form.company_name.trim() : null,
          phone: form.phone ? form.phone.trim() : null,
          license_type: form.license_type || null,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.message || "Failed to update customer details")
      }

      setFeedback({ type: "success", message: "Customer details updated successfully!" })
      await loadCustomerDetails()
      setTimeout(() => {
        setIsEditModalOpen(false)
        setFeedback(null)
      }, 1000)
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save details" })
    } finally {
      setSaving(false)
    }
  }

  const currentPtin = details?.ptin || customer?.metadata?.ptin
  const currentCfpId = details?.cfp_id || customer?.metadata?.cfp_id
  const currentCompany = details?.company_name || customer?.company_name || customer?.metadata?.company_name
  const currentPhone = details?.phone || customer?.phone || customer?.metadata?.phone
  const currentLicense = details?.license_type || customer?.metadata?.license_type || "Standard"

  return (
    <>
      <Container className="p-6 mb-6 rounded-2xl border border-ui-border-base bg-ui-bg-subtle shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-ui-border-base">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <IdBadge className="w-5 h-5" />
            </div>
            <div>
              <Heading level="h2" className="text-base font-bold text-ui-fg-base flex items-center gap-2">
                Additional Professional Information
                {currentPtin && (
                  <Badge color="purple" size="xsmall">
                    Enrolled Agent
                  </Badge>
                )}
                {currentCfpId && (
                  <Badge color="green" size="xsmall">
                    CFP Holder
                  </Badge>
                )}
              </Heading>
              <Text className="text-xs text-ui-fg-subtle">
                IRS PTIN registry, CFP Board identification, firm organization, and verified phone contact.
              </Text>
            </div>
          </div>

          <Button
            size="small"
            variant="secondary"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <PencilSquare className="w-3.5 h-3.5" />
            <span>Edit Credentials</span>
          </Button>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {/* 1. PTIN# */}
          <div className="p-4 rounded-xl border border-ui-border-base bg-ui-bg-base space-y-1.5">
            <div className="flex items-center justify-between">
              <Text className="text-[11px] font-semibold text-ui-fg-subtle uppercase tracking-wider">
                PTIN#
              </Text>
              <Badge color={currentPtin ? "purple" : "grey"} size="xsmall">
                {currentPtin ? "IRS Verified EA" : "EA Only"}
              </Badge>
            </div>
            {currentPtin ? (
              <p className="text-base font-mono font-bold text-purple-700 dark:text-purple-300 tracking-wider">
                {currentPtin}
              </p>
            ) : (
              <Text className="text-xs text-ui-fg-muted italic">Not Provided</Text>
            )}
            <Text className="text-[10px] text-ui-fg-muted">
              Starts with P + 8 digits (Enrolled Agents only)
            </Text>
          </div>

          {/* 2. CFP ID# */}
          <div className="p-4 rounded-xl border border-ui-border-base bg-ui-bg-base space-y-1.5">
            <div className="flex items-center justify-between">
              <Text className="text-[11px] font-semibold text-ui-fg-subtle uppercase tracking-wider">
                CFP ID#
              </Text>
              <Badge color={currentCfpId ? "green" : "grey"} size="xsmall">
                {currentCfpId ? "CFP Active" : "Designation Only"}
              </Badge>
            </div>
            {currentCfpId ? (
              <p className="text-base font-mono font-bold text-emerald-700 dark:text-emerald-300 tracking-wider">
                {currentCfpId}
              </p>
            ) : (
              <Text className="text-xs text-ui-fg-muted italic">Not Provided</Text>
            )}
            <Text className="text-[10px] text-ui-fg-muted">
              CFP Board Certified Planner ID
            </Text>
          </div>

          {/* 3. Company / Firm Name */}
          <div className="p-4 rounded-xl border border-ui-border-base bg-ui-bg-base space-y-1.5">
            <div className="flex items-center justify-between">
              <Text className="text-[11px] font-semibold text-ui-fg-subtle uppercase tracking-wider">
                Company / Firm Name
              </Text>
              <Buildings className="w-3.5 h-3.5 text-ui-fg-muted" />
            </div>
            {currentCompany ? (
              <p className="text-sm font-semibold text-ui-fg-base truncate" title={currentCompany}>
                {currentCompany}
              </p>
            ) : (
              <Text className="text-xs text-ui-fg-muted italic">Not Provided</Text>
            )}
            <Text className="text-[10px] text-ui-fg-muted">
              Employer or professional accounting practice
            </Text>
          </div>

          {/* 4. Phone Number */}
          <div className="p-4 rounded-xl border border-ui-border-base bg-ui-bg-base space-y-1.5">
            <div className="flex items-center justify-between">
              <Text className="text-[11px] font-semibold text-ui-fg-subtle uppercase tracking-wider">
                Phone Number
              </Text>
              <Phone className="w-3.5 h-3.5 text-ui-fg-muted" />
            </div>
            {currentPhone ? (
              <p className="text-sm font-mono font-semibold text-ui-fg-base">
                {currentPhone}
              </p>
            ) : (
              <Text className="text-xs text-ui-fg-muted italic">Not Provided</Text>
            )}
            <Text className="text-[10px] text-ui-fg-muted">
              Primary telephone contact
            </Text>
          </div>
        </div>

        {/* Footer info pill */}
        <div className="mt-4 pt-3 border-t border-ui-border-base/60 flex items-center justify-between text-xs text-ui-fg-subtle">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ui-fg-muted">Designation:</span>
            <Badge color="blue" size="xsmall">
              {currentLicense}
            </Badge>
          </div>
          {details?.entitlements && (
            <Text className="text-[11px] text-ui-fg-muted">
              Purchased Webinars & Passes: <strong>{details.entitlements.length}</strong>
            </Text>
          )}
        </div>
      </Container>

      {/* Edit Details Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <div className="flex items-center gap-2">
                <IdBadge className="w-5 h-5 text-blue-600" />
                <Heading level="h2" className="text-base font-bold text-ui-fg-base">
                  Edit Professional Credentials
                </Heading>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setFeedback(null)
                }}
                className="text-ui-fg-muted hover:text-ui-fg-base p-1 rounded-lg"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* PTIN# */}
              <div>
                <label className="block text-xs font-semibold text-ui-fg-base mb-1">
                  PTIN# (For Enrolled Agents only)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. P12345678"
                  value={form.ptin}
                  onChange={(e) => setForm({ ...form, ptin: e.target.value.toUpperCase() })}
                  maxLength={9}
                />
                <Text className="text-[11px] text-ui-fg-muted mt-1">
                  Must start with a capital <strong>P</strong> followed by exactly 8 digits with no spaces.
                </Text>
              </div>

              {/* CFP ID# */}
              <div>
                <label className="block text-xs font-semibold text-ui-fg-base mb-1">
                  CFP ID# (For CFP Designation holders only)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 294810"
                  value={form.cfp_id}
                  onChange={(e) => setForm({ ...form, cfp_id: e.target.value })}
                />
                <Text className="text-[11px] text-ui-fg-muted mt-1">
                  Official CFP Board identification number.
                </Text>
              </div>

              {/* Company / Firm Name */}
              <div>
                <label className="block text-xs font-semibold text-ui-fg-base mb-1">
                  Company / Firm Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Apex Tax Advisors LLP"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-ui-fg-base mb-1">
                  Phone Number
                </label>
                <Input
                  type="text"
                  placeholder="e.g. (555) 234-5678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              {/* License Type */}
              <div>
                <label className="block text-xs font-semibold text-ui-fg-base mb-1">
                  Primary Credential
                </label>
                <select
                  value={form.license_type}
                  onChange={(e) => setForm({ ...form, license_type: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-ui-border-base bg-ui-bg-field text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="CPA">CPA (Certified Public Accountant)</option>
                  <option value="EA">EA (Enrolled Agent)</option>
                  <option value="CFP">CFP (Certified Financial Planner)</option>
                  <option value="JD">Tax Attorney / JD / LLM</option>
                  <option value="Corporate">Corporate Executive / Controller</option>
                  <option value="Other">Other Financial Professional</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ui-border-base">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Credentials"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
