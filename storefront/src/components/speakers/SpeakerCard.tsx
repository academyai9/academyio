import React from "react"
import Link from "next/link"
import { Award, BookOpen, Building2, ChevronRight, GraduationCap, UserCheck, ShieldCheck } from "lucide-react"
import { SpeakerItem } from "@lib/data/webinars"

interface SpeakerCardProps {
  speaker: SpeakerItem
  countryCode?: string
}

export default function SpeakerCard({ speaker, countryCode = "us" }: SpeakerCardProps) {
  const profileUrl = `/${countryCode}/speakers/${speaker.id}`

  // Extract credentials list if provided
  const credentials = speaker.qualifications
    ? speaker.qualifications.split(",").map((q) => q.trim()).filter(Boolean)
    : []

  return (
    <div className="group flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden">
      <div className="p-6 space-y-4">
        {/* Top Header: Avatar & Badges */}
        <div className="flex items-start gap-4">
          <Link href={profileUrl} className="relative shrink-0 block">
            {speaker.photo_url ? (
              <img
                src={speaker.photo_url}
                alt={speaker.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-gray-100 dark:border-slate-700 shadow-sm group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-sm group-hover:scale-105 transition-transform duration-200">
                {speaker.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <span
              title="Verified AcademyIO Faculty"
              className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white dark:border-slate-900 shadow-xs"
            >
              <UserCheck className="w-3 h-3" />
            </span>
          </Link>

          <div className="flex-1 min-w-0">
            {/* Credentials Pills */}
            {credentials.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {credentials.slice(0, 3).map((cred, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/80"
                  >
                    {cred}
                  </span>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-1.5">
                <GraduationCap className="w-3 h-3" />
                Faculty Member
              </span>
            )}

            <Link href={profileUrl} className="block">
              <h3 className="font-bold text-lg text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                {speaker.name}
              </h3>
            </Link>

            <p className="text-xs font-medium text-gray-600 dark:text-slate-400 truncate mt-0.5">
              {speaker.designation || speaker.title || "Subject Matter Authority"}
            </p>

            {speaker.company && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-1 truncate">
                <Building2 className="w-3 h-3 shrink-0 text-gray-400" />
                <span className="truncate">{speaker.company}</span>
              </p>
            )}
          </div>
        </div>

        {/* Bio Snippet */}
        <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
          {speaker.bio ||
            "Recognized subject matter expert providing specialized continuing professional education courses and regulatory compliance guidance."}
        </p>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3.5 bg-gray-50/70 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-slate-300">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Accredited Faculty</span>
        </div>

        <Link
          href={profileUrl}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 group-hover:translate-x-0.5 transition-all"
        >
          <span>View Profile</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
