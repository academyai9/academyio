import React from "react"
import { Metadata } from "next"
import Link from "next/link"
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  ShieldCheck,
  Building2,
} from "lucide-react"
import { getContactInfo } from "@lib/data/contact"
import ContactInquiryForm from "./ContactInquiryForm"

export const metadata: Metadata = {
  title: "Contact Us & Corporate Headquarters | AcademyIO",
  description:
    "Get in touch with AcademyIO customer advisory team. Corporate headquarters located at 261 Blossom St, Dos Palos, California 93620, United States.",
  openGraph: {
    title: "Contact Us | AcademyIO",
    description:
      "Contact AcademyIO for CPE accreditation, webinar registrations, or mail our headquarters at 261 Blossom St, Dos Palos, California.",
  },
}

export default async function ContactPage() {
  const contact = await getContactInfo()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-slate-600" />
        <span className="font-semibold text-gray-900 dark:text-slate-200">Contact Us</span>
      </nav>

      {/* Main Header */}
      <div className="max-w-3xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
          <Building2 className="w-3.5 h-3.5" />
          <span>Customer Support & Inquiries</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Contact Our Academic Support Team
        </h1>
        <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
          Have questions regarding CPE credit eligibility, corporate group registrations, speaker materials, or billing?
          We are here to assist you from our California headquarters and across all broadcast channels.
        </p>
      </div>

      {/* Top Grid: Cards on Left, Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Information Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Official Corporate Address */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-100 dark:border-blue-900/50 p-6 shadow-sm space-y-3 relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 dark:bg-blue-950/30 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />

            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Corporate Headquarters</h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">{contact.company_name} Official Office</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Official
              </span>
            </div>

            <div className="text-xs text-gray-700 dark:text-slate-300 space-y-1 pl-1 font-medium leading-relaxed pt-1">
              <p className="font-bold text-gray-900 dark:text-white text-sm">{contact.street_address}</p>
              <p>{contact.city}, {contact.state}</p>
              <p>{contact.country} - {contact.postal_code}</p>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{contact.city}, {contact.state}</span>
              </div>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">ZIP {contact.postal_code}</span>
            </div>
          </div>

          {/* Card 2: Support Email */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Direct Support Email</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">Fast assistance for registration & CPE</p>
              </div>
            </div>
            <a
              href={`mailto:${contact.support_email}`}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 block pl-1 transition-colors"
            >
              {contact.support_email}
            </a>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1">Response time: within 2 hours during business hours</p>
          </div>

          {/* Card 3: Advisory Phone */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Customer Advisory Phone</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">Corporate & group consultation</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 pl-1 font-mono">{contact.support_phone}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1">{contact.support_hours}</p>
          </div>

          {/* Card 4: Live Broadcast Support */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Live Broadcast Support</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">Real-time troubleshooting during sessions</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300 pl-1 leading-relaxed">
              Dedicated technical assistance for attendees during live webinars and polling checks.
            </p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 pl-1">{contact.broadcast_support_note}</p>
          </div>
        </div>

        {/* Inquiry Form (7 cols) */}
        <div className="lg:col-span-7">
          <ContactInquiryForm />
        </div>
      </div>

      {/* Office Location & Map Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Office Location & Directions</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Visit or Mail Our Headquarters
            </h2>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
              AcademyIO is situated at <strong className="text-gray-900 dark:text-white">{contact.formatted_address}</strong>.
              For physical courier deliveries, correspondence, or appointment requests, please see the location details below.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shrink-0 self-start sm:self-auto">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Registered Headquarters</span>
          </div>
        </div>

        {/* Embedded Map */}
        <div className="w-full h-80 sm:h-96 bg-gray-100 dark:bg-slate-950 relative overflow-hidden">
          <iframe
            title="AcademyIO Headquarters Location Map"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full dark:opacity-85 dark:contrast-[0.95] dark:brightness-90 transition-all"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(
              `${contact.street_address}, ${contact.city}, ${contact.state} ${contact.postal_code}`
            )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
          />
        </div>

        {/* Location Highlights Footer */}
        <div className="p-6 bg-gray-50/50 dark:bg-slate-950/60 border-t border-gray-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-gray-600 dark:text-slate-400">
          <div className="space-y-1">
            <span className="font-bold text-gray-900 dark:text-white block">Mailing Address</span>
            <p className="leading-relaxed">
              AcademyIO Inc.<br />
              {contact.street_address}<br />
              {contact.city}, {contact.state} {contact.postal_code}
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-gray-900 dark:text-white block">Business Hours</span>
            <p className="leading-relaxed">
              {contact.support_hours}<br />
              Closed on US federal holidays
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-gray-900 dark:text-white block">Accreditation Records</span>
            <p className="leading-relaxed">
              Continuing education audit records and CPE documentation maintained in accordance with NASBA standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
