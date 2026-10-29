import React from "react"
import { ShieldCheck } from "lucide-react"
import { AccreditationOrg, SectionSettings } from "@lib/data/organizations"

export default function AccreditationTrustBar({
  organizations = [],
  globalEnabled = true,
  settings,
}: {
  organizations: AccreditationOrg[]
  globalEnabled?: boolean
  settings?: SectionSettings
}) {
  // If global section is disabled by admin or no active organizations exist, completely hide section without layout gaps
  if (!globalEnabled || !organizations || organizations.length === 0) {
    return null
  }

  const title = settings?.title || "Recognized by Leading Professional Regulatory Bodies"
  const subtitle = settings?.subtitle || "Accredited Continuing Professional Education"
  const description = settings?.description || "Our course curricula and faculty masterclasses are designed in strict alignment with national continuing education standards."

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-950 py-16 px-4 sm:px-6 lg:px-8 border-y border-gray-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{subtitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Logos Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {organizations.map((org) => {
            const code = org.code?.toLowerCase()
            const logoUrl =
              org.logo_url && !org.logo_url.endsWith(".svg")
                ? org.logo_url
                : `/logos/${code}.png`

            return (
              <div
                key={org.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60 transition-all group"
              >
                <div className="space-y-4">
                  {/* Logo Image */}
                  <div className="h-20 w-full flex items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 shadow-2xs group-hover:scale-102 transition-transform">
                    <img
                      src={logoUrl}
                      alt={org.alt_text || `${org.short_name || org.name} Logo`}
                      className="max-h-16 max-w-full object-contain filter drop-shadow-2xs transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <span>{org.name}</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 block">
                      {org.default_credit_type} Sponsor
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {org.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
