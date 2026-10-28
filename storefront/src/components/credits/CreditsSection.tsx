import React from "react"
import { Award, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react"
import { StoreCreditType, SectionSettings } from "@lib/data/credits"

export default function CreditsSection({
  creditTypes = [],
  globalEnabled = true,
  settings,
}: {
  creditTypes: StoreCreditType[]
  globalEnabled?: boolean
  settings?: SectionSettings
}) {
  // If global section is disabled or no active credit types exist, completely hide section without layout gaps
  if (!globalEnabled || !creditTypes || creditTypes.length === 0) {
    return null
  }

  const title = settings?.title || "Earn Certified Continuing Professional Education Credits"
  const subtitle = settings?.subtitle || "Accredited Professional Credentials"
  const description = settings?.description || "AcademyIO masterclasses qualify for nationally recognized professional credentials across accounting, taxation, and human resources."

  const getCreditLogo = (c: StoreCreditType) => {
    if (c.organization_logo_url && !c.organization_logo_url.endsWith(".svg")) {
      return c.organization_logo_url
    }
    const orgCode = (c.organization_code || c.code || "").toLowerCase()
    if (orgCode.includes("nasba") || orgCode.includes("cpe")) return "/logos/nasba.png"
    if (orgCode.includes("irs") || orgCode.includes("ce")) return "/logos/irs.png"
    if (orgCode.includes("hrci")) return "/logos/hrci.png"
    if (orgCode.includes("shrm")) return "/logos/shrm.png"
    if (c.organization_logo_url) {
      return c.organization_logo_url.replace(/\.svg$/, ".png")
    }
    return null
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-amber-50/20 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 rounded-3xl border border-gray-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{subtitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Credits Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creditTypes.map((c) => {
            const logoUrl = getCreditLogo(c)
            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/60 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border border-gray-200/90 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={c.organization_short_name || c.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow-2xs"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-amber-700 dark:text-amber-300 font-black text-xs">
                          {c.badge || "CPE"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
                          {c.badge || c.code}
                        </span>
                        {c.organization_short_name && (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                            {c.organization_short_name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mt-1.5">
                        {c.name}
                      </h3>
                      <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mt-0.5 block">
                        {c.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-medium">Standard Hours:</span>
                  </div>
                  <span className="font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px]">
                    {c.default_credit_hours}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
