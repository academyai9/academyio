"use client"

import React, { useState } from "react"
import { Send, CheckCircle2, MessageSquare } from "lucide-react"

export default function ContactInquiryForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    topic: "CPE Credit & Attendance Verification",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setSubmitted(true)
      setLoading(false)
    }, 600)
  }

  if (submitted) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm text-center space-y-4 transition-colors">
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Inquiry Received Successfully</h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Thank you for contacting AcademyIO. Our educational advisory team has received your message and will respond to <strong className="text-gray-900 dark:text-white">{formData.email}</strong> within 2 business hours.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setFormData({
                fullName: "",
                email: "",
                topic: "CPE Credit & Attendance Verification",
                message: "",
              })
            }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Send Another Inquiry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
        <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-base text-gray-900 dark:text-white">Send an Inquiry to Our Academic Team</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Jane Doe"
              className="w-full text-xs p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Work Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane@firm.com"
              className="w-full text-xs p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">Topic</label>
          <select
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            className="w-full text-xs p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-950 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          >
            <option className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">CPE Credit & Attendance Verification</option>
            <option className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">Corporate Firm Discount & Bulk Passes</option>
            <option className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">Live Session Access & Joining Issues</option>
            <option className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">Billing, Receipt, or Order Inquiry</option>
            <option className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">Instructor Inquiry</option>
            <option className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">Headquarters & General Inquiries</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-gray-700 dark:text-slate-300 mb-1">
            Message <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="How can our educational team assist with your professional learning goals?"
            className="w-full text-xs p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-500 dark:focus:border-blue-400 transition-colors leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{loading ? "Sending..." : "Submit Inquiry"}</span>
        </button>
      </form>
    </div>
  )
}
