import React from "react"
import Link from "next/link"
import { Award, ShieldCheck, Mail, Phone, MapPin } from "lucide-react"

export default function Footer({ countryCode = "us" }: { countryCode?: string }) {
  return (
    <footer className="bg-slate-900 text-gray-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href={`/${countryCode}`} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                A
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Academy<span className="text-blue-500">IO</span>
              </span>
            </Link>
            <p className="text-gray-400 leading-relaxed pr-6 text-xs">
              Premier online continuing education and professional webinar platform for CPAs, Tax Attorneys,
              Controllers, and Financial Executives. Offering accredited live interactive broadcasts, on-demand
              recordings, verbatim transcripts, and comprehensive study materials.
            </p>
            <div className="flex items-center gap-4 text-gray-300 pt-2">
              <span className="flex items-center gap-1.5 text-[11px] bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                NASBA Aligned CPE
              </span>
              <span className="flex items-center gap-1.5 text-[11px] bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Encrypted Content Delivery
              </span>
            </div>
          </div>

          {/* Catalog & Formats */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Course Catalog</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href={`/${countryCode}/webinars`} className="hover:text-white transition-colors">
                  All Webinars
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/webinars/upcoming`} className="hover:text-white transition-colors">
                  Upcoming Live Sessions
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/webinars/on-demand`} className="hover:text-white transition-colors">
                  On-Demand Catalog
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/seminars`} className="hover:text-white transition-colors">
                  Masterclass Seminars
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/categories`} className="hover:text-white transition-colors">
                  Course Categories
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Portal */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Customer Portal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href={`/${countryCode}/dashboard`} className="hover:text-white transition-colors">
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/dashboard?tab=live`} className="hover:text-white transition-colors">
                  Live Webinars
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/dashboard?tab=recordings`} className="hover:text-white transition-colors">
                  Video Recordings
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/dashboard?tab=transcripts`} className="hover:text-white transition-colors">
                  Transcripts
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/dashboard?tab=downloads`} className="hover:text-white transition-colors">
                  PDF Resources
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/dashboard?tab=orders`} className="hover:text-white transition-colors">
                  Order History & Invoices
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Company & Policies</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href={`/${countryCode}/about`} className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/contact`} className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/faq`} className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/privacy`} className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/terms`} className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/refund-policy`} className="hover:text-white transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} AcademyIO Inc. All rights reserved. Medusa.js Commerce Architecture.</p>
          <div className="flex items-center gap-6">
            <Link href={`/${countryCode}/privacy`} className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href={`/${countryCode}/terms`} className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href={`/${countryCode}/refund-policy`} className="hover:text-white transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
