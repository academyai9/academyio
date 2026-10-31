import React, { useState, useEffect } from "react"
import {
  ShieldCheck,
  CheckCircle,
  XMark,
  ArrowPath,
  Eye,
  ExclamationCircle,
  Sparkles,
} from "@medusajs/icons"
import { Heading, Text, Badge, Button, Input } from "@medusajs/ui"

interface AssignedOrg {
  org_code: string
  credit_type: string
  credit_amount: string
  course_id?: string
  field_of_study?: string
  is_verified?: boolean
  status?: string
}

export default function CreditsManagementTab({
  webinar,
  webinarId,
  notify,
  getAuthHeaders,
}: {
  webinar: any
  webinarId: string
  notify: (type: "success" | "error", text: string) => void
  getAuthHeaders: () => Record<string, string>
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([])

  const [form, setForm] = useState({
    cpe_credit: "2.0",
    field_of_study: "Taxes",
    prerequisites: "None",
    learning_level: "Intermediate",
    location: "Virtual/Online",
    delivery_method: "Group Internet Based",
    irs_course_id: "",
    attendance_requirement: "Yes",
    session_duration: "100 Minutes",
    case_studies_qna: "Included",
    presentation_reference: "Available for reference",
    credit_unit: "Credits",
    additional_notes: "",
  })

  const [assignedOrgs, setAssignedOrgs] = useState<AssignedOrg[]>([])
  const [showLivePreview, setShowLivePreview] = useState(false)

  const fetchCredits = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/webinars/${webinarId}/credits`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load webinar credit details")
      const data = await res.json()

      if (data.available_organizations) {
        setAvailableOrgs(data.available_organizations)
      }

      if (data.credit_info) {
        const ci = data.credit_info
        setForm({
          cpe_credit: String(ci.cpe_credit ?? "2.0"),
          field_of_study: ci.field_of_study || "Taxes",
          prerequisites: ci.prerequisites || "None",
          learning_level: ci.learning_level || "Intermediate",
          location: ci.location || "Virtual/Online",
          delivery_method: ci.delivery_method || "Group Internet Based",
          irs_course_id: ci.irs_course_id || "",
          attendance_requirement: ci.attendance_requirement || "Yes",
          session_duration: ci.session_duration || "100 Minutes",
          case_studies_qna: ci.case_studies_qna || "Included",
          presentation_reference: ci.presentation_reference || "Available for reference",
          credit_unit: ci.credit_unit || "Credits",
          additional_notes: ci.additional_notes || "",
        })
        if (Array.isArray(ci.organizations)) {
          setAssignedOrgs(ci.organizations)
        }
      } else {
        // Defaults based on category
        const cat = (webinar?.category || "").toLowerCase()
        const isTax = cat.includes("tax")
        const isHR = cat.includes("human") || cat.includes("payroll")

        if (isTax) {
          setForm((prev) => ({
            ...prev,
            field_of_study: "Taxes",
            irs_course_id: "####",
          }))
          setAssignedOrgs([
            {
              org_code: "irs",
              credit_type: "CE Credits",
              credit_amount: "2.0",
              course_id: "####",
              field_of_study: "Federal Tax Law",
              status: "Approved",
            },
            {
              org_code: "nasba",
              credit_type: "CPE Credits",
              credit_amount: "2.0",
              course_id: `NASBA-${webinarId.slice(-5).toUpperCase()}`,
              field_of_study: "Taxes",
              status: "Registry Approved",
            },
          ])
        } else if (isHR) {
          setForm((prev) => ({
            ...prev,
            field_of_study: "Personnel / Human Resources",
          }))
          setAssignedOrgs([
            {
              org_code: "hrci",
              credit_type: "HR (General) Credits",
              credit_amount: "1.5",
              course_id: `HRCI-${webinarId.slice(-5).toUpperCase()}`,
              field_of_study: "Workforce Compliance",
              status: "Pre-Approved",
            },
            {
              org_code: "shrm",
              credit_type: "SHRM PDCs",
              credit_amount: "1.5",
              course_id: `SHRM-${webinarId.slice(-5).toUpperCase()}`,
              field_of_study: "HR Expertise",
              status: "PDC Eligible",
            },
          ])
        }
      }
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (webinarId) {
      fetchCredits()
    }
  }, [webinarId])

  const handleToggleOrg = (code: string) => {
    const exists = assignedOrgs.find((o) => o.org_code === code)
    if (exists) {
      setAssignedOrgs(assignedOrgs.filter((o) => o.org_code !== code))
    } else {
      const orgMeta = availableOrgs.find((o) => o.code === code)
      setAssignedOrgs([
        ...assignedOrgs,
        {
          org_code: code,
          credit_type: orgMeta?.default_credit_type || "CPE Credits",
          credit_amount: form.cpe_credit || "2.0",
          course_id: code === "irs" ? form.irs_course_id || "####" : "",
          field_of_study: form.field_of_study || "",
          status: "Approved",
          is_verified: true,
        },
      ])
    }
  }

  const handleUpdateAssignedOrg = (code: string, field: keyof AssignedOrg, value: any) => {
    setAssignedOrgs(
      assignedOrgs.map((o) => (o.org_code === code ? { ...o, [field]: value } : o))
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...form,
        organizations: assignedOrgs,
      }

      const res = await fetch(`/admin/webinars/${webinarId}/credits`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || err.error || "Failed to save credits")
      }

      notify("success", "Credits & educational information saved successfully")
      fetchCredits()
    } catch (err: any) {
      notify("error", err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-ui-fg-muted flex items-center justify-center gap-2">
        <ArrowPath className="w-5 h-5 animate-spin text-blue-600" />
        <span>Loading educational credit settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-ui-bg-subtle p-6 rounded-2xl border border-ui-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h2" className="text-xl font-bold">Credits & Educational Information</Heading>
            <Badge color="blue" size="small">NASBA • IRS • HRCI • SHRM</Badge>
          </div>
          <Text className="text-xs text-ui-fg-subtle mt-1">
            Configure recommended CPE credits, delivery method, IRS course identification, and assign verified organization seals.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4" />
            <span>{showLivePreview ? "Hide Preview" : "Preview Public View"}</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Credit Settings"}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: Core Educational Fields */}
        <div className="bg-ui-bg-base p-6 rounded-2xl border border-ui-border-base space-y-6">
          <div className="border-b border-ui-border-base pb-3">
            <h3 className="font-bold text-sm text-ui-fg-base">Standard Educational Specifications</h3>
            <p className="text-xs text-ui-fg-muted mt-0.5">
              These details render in the public "Credits and Other Information" table on the webinar page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Recommended CPE Credit *
              </label>
              <Input
                value={form.cpe_credit}
                onChange={(e) => setForm({ ...form, cpe_credit: e.target.value })}
                placeholder="e.g. 2.0"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Recommended Field of Study *
              </label>
              <Input
                value={form.field_of_study}
                onChange={(e) => setForm({ ...form, field_of_study: e.target.value })}
                placeholder="e.g. Taxes, Accounting, Auditing"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Session Learning Level *
              </label>
              <select
                className="w-full text-xs p-2.5 rounded-xl border border-ui-border-base bg-ui-bg-subtle"
                value={form.learning_level}
                onChange={(e) => setForm({ ...form, learning_level: e.target.value })}
              >
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Overview">Overview</option>
                <option value="Update">Update</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Delivery Method *
              </label>
              <select
                className="w-full text-xs p-2.5 rounded-xl border border-ui-border-base bg-ui-bg-subtle"
                value={form.delivery_method}
                onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
              >
                <option value="Group Internet Based">Group Internet Based</option>
                <option value="QAS Self Study">QAS Self Study</option>
                <option value="Nano Learning">Nano Learning</option>
                <option value="Group Live">Group Live</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Session Duration *
              </label>
              <Input
                value={form.session_duration}
                onChange={(e) => setForm({ ...form, session_duration: e.target.value })}
                placeholder="e.g. 100 Minutes"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Location
              </label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Virtual/Online"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                IRS Course ID (If Applicable)
              </label>
              <Input
                value={form.irs_course_id}
                onChange={(e) => setForm({ ...form, irs_course_id: e.target.value })}
                placeholder="e.g. ####"
              />
              <span className="text-[10px] text-ui-fg-muted mt-1 block">Required for IRS CE Provider reporting</span>
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Session Prerequisites & Prep
              </label>
              <Input
                value={form.prerequisites}
                onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
                placeholder="e.g. None"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Attendance Requirement
              </label>
              <Input
                value={form.attendance_requirement}
                onChange={(e) => setForm({ ...form, attendance_requirement: e.target.value })}
                placeholder="e.g. Yes"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Case Studies & Live Q&A Session
              </label>
              <Input
                value={form.case_studies_qna}
                onChange={(e) => setForm({ ...form, case_studies_qna: e.target.value })}
                placeholder="e.g. Included"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                PowerPoint Presentation for Reference
              </label>
              <Input
                value={form.presentation_reference}
                onChange={(e) => setForm({ ...form, presentation_reference: e.target.value })}
                placeholder="e.g. Available for reference"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
                Credit Unit
              </label>
              <Input
                value={form.credit_unit}
                onChange={(e) => setForm({ ...form, credit_unit: e.target.value })}
                placeholder="e.g. Credits"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ui-fg-base block mb-1.5">
              Additional Notes & Regulatory Disclosures
            </label>
            <textarea
              className="w-full text-xs p-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:bg-ui-bg-base transition-colors leading-relaxed min-h-[70px]"
              value={form.additional_notes}
              onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
              placeholder="e.g. To earn accredited CPE credits, participants must log in on time and actively respond to polling questions throughout the live broadcast."
            />
          </div>
        </div>

        {/* SECTION 2: Dynamic Organization Assignment (IRS, NASBA, HRCI, SHRM) */}
        <div className="bg-ui-bg-base p-6 rounded-2xl border border-ui-border-base space-y-6">
          <div className="border-b border-ui-border-base pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-ui-fg-base">Applicable Professional Organization Logos</h3>
              <p className="text-xs text-ui-fg-muted mt-0.5">
                Select which organizations approve or recognize this specific webinar. Only selected organizations will appear on the course page.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {assignedOrgs.length} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {["irs", "nasba", "hrci", "shrm"].map((code) => {
              const found = availableOrgs.find((o) => o.code === code)
              const rawLogo = found?.logo_url || `/logos/${code}.png`
              const orgMeta = {
                code,
                name: found?.name || code.toUpperCase(),
                short_name: found?.short_name || code.toUpperCase(),
                logo_url: rawLogo.endsWith(".svg") ? rawLogo.replace(/\.svg$/, ".png") : rawLogo,
                default_credit_type: found?.default_credit_type || (code === "irs" ? "CE Credits" : code === "shrm" ? "SHRM PDCs" : "CPE Credits"),
              }

              const isAssigned = Boolean(assignedOrgs.find((o) => o.org_code === code))
              const assignedData = assignedOrgs.find((o) => o.org_code === code) || {
                credit_type: orgMeta.default_credit_type,
                credit_amount: form.cpe_credit,
                course_id: "",
                field_of_study: "",
              }

              return (
                <div
                  key={code}
                  className={`p-5 rounded-2xl border transition-all space-y-4 ${
                    isAssigned
                      ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs"
                      : "border-ui-border-base bg-ui-bg-subtle/40 opacity-75"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-10 bg-white rounded-lg border border-gray-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={orgMeta.logo_url}
                          alt={orgMeta.short_name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-ui-fg-base block">{orgMeta.short_name}</span>
                        <span className="text-[11px] text-ui-fg-muted">{orgMeta.name}</span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleToggleOrg(code)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-ui-fg-base">
                        {isAssigned ? "Enabled" : "Enable"}
                      </span>
                    </label>
                  </div>

                  {isAssigned && (
                    <div className="pt-3 border-t border-ui-border-base grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] font-bold text-ui-fg-muted block mb-1">
                          Credit Amount
                        </label>
                        <Input
                          value={assignedData.credit_amount || form.cpe_credit}
                          onChange={(e) => handleUpdateAssignedOrg(code, "credit_amount", e.target.value)}
                          placeholder="e.g. 2.0"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-ui-fg-muted block mb-1">
                          Credit Type Label
                        </label>
                        <Input
                          value={assignedData.credit_type}
                          onChange={(e) => handleUpdateAssignedOrg(code, "credit_type", e.target.value)}
                          placeholder="e.g. CE Credits"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[11px] font-bold text-ui-fg-muted block mb-1">
                          Organization Course ID (Optional)
                        </label>
                        <Input
                          value={assignedData.course_id || ""}
                          onChange={(e) => handleUpdateAssignedOrg(code, "course_id", e.target.value)}
                          placeholder={code === "irs" ? "####" : "Course/Program ID"}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* SECTION 3: Live Public Card Preview */}
        {showLivePreview && (
          <div className="bg-ui-bg-base p-6 rounded-3xl border border-ui-border-base space-y-6 shadow-md animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Live Storefront Section Preview
              </span>
              <Badge color="green" size="small">Verified Responsive</Badge>
            </div>

            {/* Mocked Public Webinar Detail Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 space-y-8">
              {/* Dynamic Logos Bar */}
              {assignedOrgs.length > 0 && (
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Accredited By & Approved Sponsoring Organizations
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {assignedOrgs.map((ao) => {
                      const found = availableOrgs.find((o) => o.code === ao.org_code)
                      const rawLogo = found?.logo_url || `/logos/${ao.org_code}.png`
                      const orgMeta = {
                        short_name: found?.short_name || ao.org_code.toUpperCase(),
                        name: found?.name || ao.org_code.toUpperCase(),
                        logo_url: rawLogo.endsWith(".svg") ? rawLogo.replace(/\.svg$/, ".png") : rawLogo,
                      }
                      return (
                        <div
                          key={ao.org_code}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40"
                        >
                          <div className="w-24 h-12 bg-white rounded-lg border border-gray-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src={orgMeta.logo_url}
                              alt={orgMeta.short_name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white block">
                              {ao.credit_amount} {ao.credit_type}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-slate-400">
                              {orgMeta.short_name} • {ao.status || "Approved"}
                            </span>
                            {ao.course_id && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-mono mt-0.5">
                                ID: {ao.course_id}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Two-Column Credits Table */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  Credits and Other Information
                </h4>
                <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                  {[
                    { label: "Recommended CPE Credit", val: `${form.cpe_credit} ${form.credit_unit}` },
                    { label: "Recommended Field of Study", val: form.field_of_study },
                    { label: "Session Prerequisites & Preparation", val: form.prerequisites },
                    { label: "Session Learning Level", val: form.learning_level },
                    { label: "Location", val: form.location },
                    { label: "Delivery Method", val: form.delivery_method },
                    ...(form.irs_course_id ? [{ label: "IRS Course ID", val: form.irs_course_id }] : []),
                    { label: "Attendance Requirement", val: form.attendance_requirement },
                    { label: "Session Duration", val: form.session_duration },
                    { label: "Case Studies and Live Q&A", val: form.case_studies_qna },
                    { label: "PowerPoint Presentation", val: form.presentation_reference },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-1 sm:grid-cols-2 p-3 ${
                        i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-gray-50 dark:bg-slate-800/40"
                      }`}
                    >
                      <span className="font-bold text-gray-900 dark:text-slate-200">{row.label}</span>
                      <span className="text-gray-700 dark:text-slate-300 font-medium">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-ui-border-base">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Credit Settings"}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
