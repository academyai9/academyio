import React from "react"

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Legal Terms</span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Terms and Conditions of Service</h1>
        <p className="text-xs text-gray-500 mt-2">Last Updated: October 1, 2026</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6 text-sm text-gray-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By enrolling in any webinar, seminar, or purchasing recorded materials through AcademyIO, you agree to abide
            by these Terms and Conditions. These terms govern your rights and licenses regarding course materials and certifications.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">2. Single-User Personal License</h2>
          <p>
            Each webinar or material purchase grants a non-transferable, single-user license intended exclusively for the registered
            individual. Sharing live meeting URLs, video stream links, or customer login credentials with unregistered colleagues
            is strictly prohibited and may result in immediate revocation of access and forfeiture of certificate eligibility.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">3. Intellectual Property Rights</h2>
          <p>
            All video recordings, course syllabi, presentation slide decks, worksheets, and transcripts are the proprietary
            intellectual property of AcademyIO and its featured instructors. No portion of the materials may be reproduced,
            redistributed, or published without prior written authorization.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">4. Continuing Professional Education (CPE) Compliance</h2>
          <p>
            To receive a verified CPE completion certificate, participants must satisfy all attendance criteria mandated
            by regulatory standards, including continuous connection and responsive completion of required polling prompts.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">5. Limitation of Liability</h2>
          <p>
            Course materials and instructor guidance are provided for educational and analytical purposes only and do not
            constitute formal legal, tax, or accounting advice for any specific taxpayer or client scenario.
          </p>
        </section>
      </div>
    </div>
  )
}
