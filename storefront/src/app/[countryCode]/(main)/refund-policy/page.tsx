import React from "react"
import { ShieldCheck, Clock, RefreshCw } from "lucide-react"

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Satisfaction Guarantee</span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Refund & Cancellation Policy</h1>
        <p className="text-xs text-gray-500 mt-2">Effective Date: October 1, 2026</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6 text-sm text-gray-700 leading-relaxed">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
            <Clock className="w-5 h-5" />
            <h2>1. Live Webinar Cancellations</h2>
          </div>
          <p>
            Registrations for upcoming live webinars may be cancelled for a 100% full refund if requested at least
            twenty-four (24) hours prior to the scheduled broadcast start time. Refund requests submitted less than 24 hours
            prior will receive full course credit applicable toward any future live webinar or on-demand recording.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
            <RefreshCw className="w-5 h-5" />
            <h2>2. Session Exchange & Recording Substitution</h2>
          </div>
          <p>
            If you are registered for a live session but are prevented from attending due to emergency client deadlines
            or unforeseen commitments, you may exchange your enrollment for the full recording package and transcript
            at no extra fee.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-base">
            <ShieldCheck className="w-5 h-5" />
            <h2>3. On-Demand Recordings & Downloadable PDFs</h2>
          </div>
          <p>
            Due to the instantaneous delivery of proprietary materials, on-demand courses, transcripts, and downloadable
            study guides are non-refundable once content streaming has commenced or files have been downloaded from your dashboard.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">4. Technical Hardship Guarantee</h2>
          <p>
            In the rare event of an unresolvable server interruption or technical broadcast failure that prevents a live
            session from being completed, all registered participants will receive the full recording and transcripts
            plus a 100% credit toward any future course.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">5. How to Request a Refund</h2>
          <p>
            To submit a cancellation or exchange, please email refunds@academyio.com with your Order Number and full name.
            Eligible refunds will be credited back to your original payment card within 3 to 5 business days.
          </p>
        </section>
      </div>
    </div>
  )
}
