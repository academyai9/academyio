import React from "react"
import Link from "next/link"
import { BookOpen, Calculator, FileSpreadsheet, Building2, Landmark, Cpu, ArrowRight } from "lucide-react"
import { getWebinars } from "@lib/data/webinars"
import WebinarCard from "@/components/webinars/WebinarCard"

const CATEGORY_DEFINITIONS = [
  {
    name: "Federal Taxation",
    slug: "Federal Taxation",
    icon: Calculator,
    desc: "IRS Form compliance, S-Corporation basis, Partnership Schedule K-1, Section 1031 exchanges, and federal tax reform.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    name: "Auditing & Accounting",
    slug: "Auditing & Accounting",
    icon: FileSpreadsheet,
    desc: "FASB Accounting Standards Updates, ASC 606 revenue recognition, ASC 842 lease compliance, and AICPA audit standards.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    name: "Corporate Tax",
    slug: "Corporate Tax",
    icon: Building2,
    desc: "Section 174 R&E expenditure amortization, Section 163(j) business interest limits, and corporate restructuring.",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    name: "Estate & Financial Planning",
    slug: "Estate & Financial Planning",
    icon: Landmark,
    desc: "SLATs, GRATs, high-net-worth wealth preservation, generation-skipping transfer tax, and dynastic trusts.",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    name: "Emerging Technology & Audit",
    slug: "Emerging Technology & Audit",
    icon: Cpu,
    desc: "AI journal entry anomaly detection, automated risk assessments, algorithmic fraud auditing, and internal controls.",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
]

export default async function CategoriesPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const { webinars } = await getWebinars({ limit: 50 })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Curriculum Disciplines</span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Webinar Categories & Subject Areas</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
          Browse targeted courses tailored to your specific field of practice. All categories are taught by
          accredited specialists and satisfy continuing professional education standards.
        </p>
      </div>

      {/* Category Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORY_DEFINITIONS.map((cat, idx) => {
          const Icon = cat.icon
          const matchingCount = webinars.filter((w) => w.category === cat.name).length

          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl border ${cat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                    {matchingCount} Courses
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{cat.name}</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{cat.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <Link
                  href={`/${countryCode}/webinars?category=${encodeURIComponent(cat.slug)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  Explore {cat.name}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
