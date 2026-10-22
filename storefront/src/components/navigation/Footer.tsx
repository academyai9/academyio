import React from "react"
import Link from "next/link"
import { Award, ShieldCheck, MapPin } from "lucide-react"
import { getStoreSocialLinks } from "@lib/data/social-media"
import { getContactInfo } from "@lib/data/contact"
import SocialFollowBar from "./SocialFollowBar"
import OpenCookiePreferencesButton from "@/components/cookies/OpenCookiePreferencesButton"
import NewsletterSubscribeForm from "@/components/newsletter/NewsletterSubscribeForm"

export default async function Footer({ countryCode = "us" }: { countryCode?: string }) {
  const [socialData, contactInfo] = await Promise.all([
    getStoreSocialLinks(),
    getContactInfo(),
  ])
  const hasSocialBar = Boolean(
    socialData.global_enabled &&
    socialData.social_links &&
    socialData.social_links.length > 0
  )

  return (
    <footer className="bg-slate-900 text-gray-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Newsletter Signup Banner in Footer */}
        <div className="mb-14 p-6 sm:p-8 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl text-center lg:text-left">
            <h3 className="text-white font-bold text-base sm:text-lg tracking-tight">
              Stay Updated with AcademyIO
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Receive updates about upcoming webinars, new courses, professional education, and special offers.
            </p>
          </div>
          <div className="w-full lg:w-96">
            <NewsletterSubscribeForm countryCode={countryCode} source="website_footer" variant="compact" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-1 space-y-4">
            <Link href={`/${countryCode}`} className="inline-block" aria-label="AcademyIO Homepage">
              <img
                src="/logos/academyio-logo-white.png"
                alt="AcademyIO - Empowering Future Minds"
                className="h-10 w-auto max-w-[220px] object-contain"
              />
            </Link>
            <p className="text-gray-400 leading-relaxed text-xs">
              Premier online continuing education and professional webinar platform for CPAs, Tax Attorneys,
              Controllers, and Financial Executives.
            </p>
            <div className="flex flex-col gap-2 text-gray-300 pt-1">
              <span className="flex items-center gap-1.5 text-[11px] bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 w-fit">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Certifications & Reporting
              </span>
              <span className="flex items-center gap-1.5 text-[11px] bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 w-fit">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Encrypted Delivery
              </span>
            </div>
            {contactInfo?.is_active && (
              <div className="pt-2 text-[11px] text-gray-400 space-y-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-gray-300 font-semibold">
                  <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>Headquarters:</span>
                </div>
                <p className="leading-relaxed pl-4 text-gray-400">
                  {contactInfo.street_address}, {contactInfo.city}, {contactInfo.state} {contactInfo.postal_code}
                </p>
              </div>
            )}
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
                <Link href={`/${countryCode}/webinars/self-study`} className="hover:text-white transition-colors">
                  Self-Study Catalog
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/subscriptions`} className="hover:text-white transition-colors text-blue-400">
                  Monthly Subscriptions
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/courses-by-topics`} className="hover:text-white transition-colors">
                  Courses by Topics
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/speakers`} className="hover:text-white transition-colors text-amber-400 font-medium">
                  Faculty & Speakers Directory →
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
                  Conference Material
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
                <Link href={`/${countryCode}/speakers`} className="hover:text-white transition-colors">
                  Meet the Speakers
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
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href={`/${countryCode}/cookie-policy`} className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Follow Us On Social Media */}
        <SocialFollowBar
          socialLinks={socialData.social_links}
          globalEnabled={socialData.global_enabled}
          settings={socialData.settings}
        />

        {/* Bottom Bar */}
        <div
          className={`pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
            hasSocialBar ? "mt-8" : "mt-12"
          }`}
        >
          <p>© {new Date().getFullYear()} AcademyIO LLC. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href={`/${countryCode}/speakers`} className="hover:text-white text-gray-400 transition-colors">
              Faculty Directory
            </Link>
            <Link href={`/${countryCode}/privacy`} className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href={`/${countryCode}/terms`} className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href={`/${countryCode}/refund-policy`} className="hover:text-white transition-colors">
              Refund Policy
            </Link>
            <Link href={`/${countryCode}/cookie-policy`} className="hover:text-white transition-colors">
              Cookie Policy
            </Link>
            <OpenCookiePreferencesButton variant="link" className="text-gray-400 hover:text-white transition-colors">
              Cookie Preferences
            </OpenCookiePreferencesButton>
          </div>
        </div>
      </div>
    </footer>
  )
}
