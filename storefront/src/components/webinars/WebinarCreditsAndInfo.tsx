import React from "react"
import {
  Award,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"

interface AssignedOrg {
  org_code: string
  name?: string
  short_name?: string
  logo_url?: string
  website_url?: string | null
  alt_text?: string
  description?: string | null
  credit_type: string
  credit_amount: string
  course_id?: string
  field_of_study?: string
  status?: string
}

interface CreditInfoProps {
  creditInfo?: {
    cpe_credit?: number | string
    field_of_study?: string
    prerequisites?: string
    learning_level?: string
    location?: string
    delivery_method?: string
    irs_course_id?: string
    attendance_requirement?: string
    session_duration?: string
    case_studies_qna?: string
    presentation_reference?: string
    credit_unit?: string
    additional_notes?: string
    organizations?: AssignedOrg[]
  } | null
  webinar: {
    id: string
    title: string
    cpe_credits?: number
    duration_minutes?: number
    category?: string
  }
}

export default function WebinarCreditsAndInfo({
  creditInfo,
  webinar,
}: CreditInfoProps) {
  const hasCredits = (webinar.cpe_credits && webinar.cpe_credits > 0) || Boolean(creditInfo?.cpe_credit)
  if (!hasCredits && !creditInfo) {
    return null
  }

  const cpeCredit = creditInfo?.cpe_credit ?? webinar.cpe_credits ?? 0
  if (Number(cpeCredit) <= 0 && (!creditInfo || creditInfo.organizations?.length === 0)) {
    return null
  }
  const fieldOfStudy = creditInfo?.field_of_study || (webinar.category?.includes("Tax") ? "Taxes" : "Accounting")
  const prerequisites = creditInfo?.prerequisites || "None"
  const learningLevel = creditInfo?.learning_level || "Intermediate"
  const location = creditInfo?.location || "Virtual/Online"
  const deliveryMethod = creditInfo?.delivery_method || "Group Internet Based"
  const sanitizeCourseId = (id?: string | null, isIrs?: boolean) => {
    if (!id) return null
    if (isIrs || id.includes("PJGWS") || id.toUpperCase().startsWith("PJGWS")) {
      return "####"
    }
    return id
  }

  const rawIrsCourseId = creditInfo?.irs_course_id || null
  const irsCourseId = rawIrsCourseId ? sanitizeCourseId(rawIrsCourseId, true) : null
  const attendanceRequirement = creditInfo?.attendance_requirement || "Yes"
  const sessionDuration = creditInfo?.session_duration || `${webinar.duration_minutes || 100} Minutes`
  const caseStudiesQnA = creditInfo?.case_studies_qna || "Included"
  const presentationRef = creditInfo?.presentation_reference || "Available for reference"
  const additionalNotes = creditInfo?.additional_notes || null
  const assignedOrgs = creditInfo?.organizations || []

  // Specification Rows (hides rows with no value)
  const rows: Array<{ label: string; value: string | null | undefined; icon?: React.ElementType }> = [
    { label: "Recommended CPE Credit", value: `${cpeCredit} Credits` },
    { label: "Recommended Field of Study", value: fieldOfStudy },
    { label: "Session Prerequisites and Preparation", value: prerequisites },
    { label: "Session Learning Level", value: learningLevel },
    { label: "Location", value: location },
    { label: "Delivery Method", value: deliveryMethod },
    ...(irsCourseId ? [{ label: "IRS Course ID", value: irsCourseId }] : []),
    { label: "Attendance Requirement", value: attendanceRequirement },
    { label: "Session Duration", value: sessionDuration },
    { label: "Case Studies and Live Q&A Session", value: caseStudiesQnA },
    { label: "PowerPoint Presentation for Reference", value: presentationRef },
  ].filter((r) => Boolean(r.value))

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Credits and Other Information
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Program qualifications, field of study classifications, and approved accreditation details.
          </p>
        </div>

        {cpeCredit ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0 self-start sm:self-auto">
            <span>{cpeCredit} Recommended CPE Credits</span>
          </div>
        ) : null}
      </div>

      {/* Dynamic Sponsoring Organizations Logos (Displays ONLY assigned organizations) */}
      {assignedOrgs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Accredited Organization Recognition
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignedOrgs.map((org) => {
              const code = org.org_code?.toLowerCase()
              const rawLogo = org.logo_url
              const logo =
                rawLogo && !rawLogo.endsWith(".svg")
                  ? rawLogo
                  : ["irs", "nasba", "hrci", "shrm"].includes(code || "")
                  ? `/logos/${code}.png`
                  : rawLogo || (code ? `/logos/${code}.png` : "")
              const name = org.name || org.short_name || code?.toUpperCase()

              return (
                <div
                  key={code}
                  className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-850 p-4.5 flex items-start gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-2xs"
                >
                  <div className="w-24 h-14 bg-white rounded-xl border border-gray-200 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                    <img
                      src={logo}
                      alt={org.alt_text || `${name} Logo`}
                      className="max-w-full max-h-full object-contain filter drop-shadow-2xs"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget
                        if (code && !target.src.includes(`${code}.png`)) {
                          target.src = `/logos/${code}.png`
                        }
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {org.credit_amount} {org.credit_type}
                      </span>
                      {org.status && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          {org.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5 font-medium truncate">
                      {name}
                    </p>
                    {org.course_id && (
                      <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                        ID: {sanitizeCourseId(org.course_id, code === "irs")}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Two-Column Specification Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          Course Specifications & Delivery Requirements
        </h3>

        <div className="border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 text-xs">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-1 sm:grid-cols-12 p-3.5 sm:px-5 gap-1.5 sm:gap-4 items-center transition-colors ${
                idx % 2 === 0
                  ? "bg-white dark:bg-slate-900"
                  : "bg-gray-50/70 dark:bg-slate-800/40"
              }`}
            >
              <div className="sm:col-span-5 font-bold text-gray-900 dark:text-slate-200">
                {row.label}
              </div>
              <div className="sm:col-span-7 font-medium text-gray-700 dark:text-slate-300 break-words">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Notes & Attendance Disclosures */}
      {additionalNotes && (
        <div className="bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/60 p-4.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Attendance & Credit Verification Policy</span>
          </div>
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            {additionalNotes}
          </p>
        </div>
      )}
    </div>
  )
}
