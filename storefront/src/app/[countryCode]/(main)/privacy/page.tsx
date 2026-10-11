import React from "react"
import { Shield } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Compliance & Security</span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mt-2">Effective Date: October 1, 2026 • Version 2.4</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-6 text-sm text-gray-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">1. Information Collection & Usage</h2>
          <p>
            AcademyIO collects information necessary to fulfill educational purchases, certify professional continuing
            education attendance, and deliver digital course materials. This includes your name, professional email address,
            firm affiliation, license numbers (for CPE reporting where applicable), and transaction records.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">2. Payment Security & Encryption</h2>
          <p>
            All online credit card transactions are processed securely through PCI-DSS Level 1 certified payment gateways
            (such as Stripe). AcademyIO never stores, logs, or transmits raw payment card numbers or CVV codes on our servers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">3. Attendance & CPE Verification Data</h2>
          <p>
            In accordance with state boards of accountancy and continuing education regulatory frameworks, AcademyIO
            maintains auditable attendance logs (including login timestamps and polling response answers) for five (5) years
            to substantiate certificate validity upon regulatory audit.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">4. Third-Party Disclosures</h2>
          <p>
            We do not sell, rent, or trade your personal or corporate contact details to external advertisers or marketers.
            Information is disclosed strictly to authorized regulatory boards upon verified request to substantiate earned CPE.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">5. Contact Our Data Protection Officer</h2>
          <p>
            For privacy inquiries, data deletion requests, or compliance reviews, please email privacy@academyio.com.
          </p>
        </section>
      </div>
    </div>
  )
}
