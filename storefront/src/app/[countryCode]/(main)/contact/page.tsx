"use client"

import React, { useState } from "react"
import { Mail, Phone, MapPin, Send, CheckCircle2, Clock } from "lucide-react"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setSubmitted(true)
      setLoading(false)
    }, 700)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="max-w-2xl">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Customer Support & Inquiries</span>
        <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Contact Our Academic Support Team</h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Have questions regarding CPE credit eligibility, corporate group registrations, speaker materials, or billing?
          We are here to assist you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Contact Information Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-blue-600">
              <Mail className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-sm">Direct Support Email</h3>
            </div>
            <p className="text-xs text-gray-600">support@academyio.com</p>
            <p className="text-[11px] text-gray-400">Response time: within 2 hours during business hours</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-blue-600">
              <Phone className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-sm">Customer Advisory Phone</h3>
            </div>
            <p className="text-xs text-gray-600">+1 (800) 555-CPE-PASS (toll free)</p>
            <p className="text-[11px] text-gray-400">Monday - Friday: 8:00 AM - 6:00 PM EST</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-blue-600">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-gray-900 text-sm">Live Broadcast Support</h3>
            </div>
            <p className="text-xs text-gray-600">Dedicated assistance for attendees during live webinars</p>
            <p className="text-[11px] text-gray-400">Available 30 minutes prior to scheduled start</p>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900">Inquiry Received</h3>
              <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                Thank you for contacting AcademyIO. Our educational advisory team has received your message and will respond shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-bold text-base text-gray-900 mb-2">Send an Inquiry</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@firm.com"
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Topic</label>
                <select className="w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-800">
                  <option>CPE Credit & Attendance Verification</option>
                  <option>Corporate Firm Discount & Bulk Passes</option>
                  <option>Live Session Access & Joining Issues</option>
                  <option>Billing, Receipt, or Order Inquiry</option>
                  <option>Instructor Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="How can we assist your professional learning goals?"
                  className="w-full text-sm p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? "Sending..." : "Submit Inquiry"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
