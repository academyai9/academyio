import React from "react"
import Link from "next/link"
import { CheckCircle2, ShieldCheck, Clock, Award, Info, ArrowRight, ExternalLink } from "lucide-react"
import { StoreOtherInfoItem, SectionSettings } from "@lib/data/other-info"

const getIcon = (iconName?: string | null) => {
  switch (iconName) {
    case "shield-check":
      return ShieldCheck
    case "clock":
      return Clock
    case "award":
      return Award
    case "check-circle":
      return CheckCircle2
    default:
      return Info
  }
}

export default function OtherInfoSection({
  items = [],
  globalEnabled = true,
  settings,
}: {
  items: StoreOtherInfoItem[]
  globalEnabled?: boolean
  settings?: SectionSettings
}) {
  // If global section is disabled or no items exist, completely hide section without layout gaps
  if (!globalEnabled || !items || items.length === 0) {
    return null
  }

  const title = settings?.title || "Continuing Education Standards & Compliance Disclosures"
  const subtitle = settings?.subtitle || "Important Program Guidelines"
  const description = settings?.description || "Essential regulatory details regarding attendance tracking, certificate delivery, and multi-state board reciprocity."

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{subtitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Info Items Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const IconComponent = getIcon(item.icon)
            const isExternalLink = item.link_url?.startsWith("http")

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60 transition-all group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-block mb-1">
                            {item.badge}
                          </span>
                        )}
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {item.link_url && (
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800/80">
                    {isExternalLink ? (
                      <a
                        href={item.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>{item.link_text || "Learn More"}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <Link
                        href={item.link_url}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 group/link"
                      >
                        <span>{item.link_text || "Learn More"}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
