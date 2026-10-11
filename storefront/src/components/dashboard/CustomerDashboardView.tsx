"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Video,
  PlayCircle,
  FileText,
  Download,
  ShoppingBag,
  User,
  Calendar,
  Clock,
  ExternalLink,
  Award,
  CheckCircle,
  AlertCircle,
  LogOut,
  ChevronRight,
  Shield,
  FileCheck,
} from "lucide-react"

interface DashboardProps {
  customer: any
  summary: any
  purchasedWebinars: any[]
  countryCode: string
  activeTab?: string
}

export default function CustomerDashboardView({
  customer,
  summary,
  purchasedWebinars,
  countryCode,
  activeTab: defaultTab = "overview",
}: DashboardProps) {
  const [tab, setTab] = useState<string>(defaultTab)
  const [selectedTranscript, setSelectedTranscript] = useState<any | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null)

  const liveWebinars = purchasedWebinars.filter((w) => w.access.has_live)
  const recordings = purchasedWebinars.filter((w) => w.access.has_recording)
  const transcripts = purchasedWebinars.filter((w) => w.access.has_transcript)
  const pdfWebinars = purchasedWebinars.filter((w) => w.access.has_pdf)

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Customer Header Banner */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              {customer?.first_name ? customer.first_name[0] : "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {customer?.first_name || "Professional"}!
                </h1>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
                  Verified Member
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{customer?.email || "customer@academyio.com"}</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-gray-50 px-5 py-3 rounded-xl border border-gray-100 text-sm">
            <div>
              <span className="text-xs text-gray-500 block">Active Courses</span>
              <span className="font-bold text-gray-900 text-lg">{purchasedWebinars.length}</span>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <span className="text-xs text-gray-500 block">Total Orders</span>
              <span className="font-bold text-gray-900 text-lg">{summary?.total_orders_with_webinars || 1}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs & Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-1">
            <nav className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm space-y-1">
              {[
                { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
                { id: "live", label: "My Live Webinars", count: liveWebinars.length, icon: Video },
                { id: "recordings", label: "My Recordings", count: recordings.length, icon: PlayCircle },
                { id: "transcripts", label: "My Transcripts", count: transcripts.length, icon: FileText },
                { id: "downloads", label: "PDF Downloads", count: pdfWebinars.length, icon: Download },
                { id: "orders", label: "My Orders", icon: ShoppingBag },
                { id: "profile", label: "Account Profile", icon: User },
              ].map((item) => {
                const Icon = item.icon
                const active = tab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Dashboard Panels */}
          <div className="lg:col-span-3 space-y-6">
            {/* TAB: OVERVIEW */}
            {tab === "overview" && (
              <div className="space-y-6">
                {/* 4 Overview Statistics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Upcoming Live</span>
                      <Video className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{liveWebinars.length}</span>
                    <span className="text-[11px] text-gray-400">Scheduled events</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Recordings</span>
                      <PlayCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{recordings.length}</span>
                    <span className="text-[11px] text-gray-400">On-demand access</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Transcripts</span>
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{transcripts.length}</span>
                    <span className="text-[11px] text-gray-400">Verbatim texts</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">PDF Resources</span>
                      <Download className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{pdfWebinars.length}</span>
                    <span className="text-[11px] text-gray-400">Guides & forms</span>
                  </div>
                </div>

                {/* Recently Purchased Section */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900">Your Enrolled Courses</h2>
                    <span className="text-xs text-gray-500">{purchasedWebinars.length} items</span>
                  </div>

                  <div className="space-y-4">
                    {purchasedWebinars.map((item) => (
                      <div
                        key={item.webinar.id}
                        className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4">
                          {item.webinar.featured_image ? (
                            <img
                              src={item.webinar.featured_image}
                              alt={item.webinar.title}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                              <Video className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-blue-600">{item.webinar.category}</span>
                              {item.webinar.cpe_credits > 0 && (
                                <span className="text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  {item.webinar.cpe_credits} CPE
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm mt-0.5">{item.webinar.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">Instructor: {item.webinar.speaker_name}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                          {item.access.has_live && (
                            <button
                              onClick={() => setTab("live")}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            >
                              Join Live
                            </button>
                          )}
                          {item.access.has_recording && (
                            <button
                              onClick={() => setTab("recordings")}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            >
                              Watch Video
                            </button>
                          )}
                          {item.access.has_pdf && (
                            <button
                              onClick={() => setTab("downloads")}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                            >
                              PDFs
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MY LIVE WEBINARS */}
            {tab === "live" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">My Live Webinars</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Live session credentials and joining links are activated here prior to event broadcast.
                  </p>
                </div>

                {liveWebinars.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No upcoming live webinars enrolled.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {liveWebinars.map((item) => (
                      <div key={item.webinar.id} className="border border-gray-200 rounded-xl p-6 bg-white space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                          <div>
                            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                              Confirmed Registration
                            </span>
                            <h3 className="text-base font-bold text-gray-900 mt-1">{item.webinar.title}</h3>
                          </div>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 self-start sm:self-center">
                            <CheckCircle className="w-3.5 h-3.5" /> Enrolled & Verified
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>
                              {new Date(item.webinar.event_date).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span>
                              {item.webinar.start_time} - {item.webinar.end_time} ({item.webinar.timezone})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span>Speaker: {item.webinar.speaker_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-blue-600" />
                            <span>Continuing Education: {item.webinar.cpe_credits} CPE Credits</span>
                          </div>
                        </div>

                        {/* Secure Live Joining Box */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
                              <Shield className="w-4 h-4 text-blue-700" />
                              Official Live Meeting Access
                            </h4>
                            <p className="text-xs text-blue-700 mt-1">
                              Please join 5-10 minutes prior to the broadcast. Interactive Q&A chat enabled.
                            </p>
                          </div>
                          <a
                            href="https://zoom.us/j/98421038592?pwd=AcademyWebinarSecureToken"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whitespace-nowrap px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                          >
                            Launch Live Session
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MY RECORDINGS */}
            {tab === "recordings" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">My Video Recordings</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Stream your purchased webinars in high definition with playback controls and bookmarks.
                  </p>
                </div>

                <div className="space-y-4">
                  {recordings.map((item) => (
                    <div
                      key={item.webinar.id}
                      className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            HD Video Available
                          </span>
                          <span className="text-xs text-gray-400">1 Year Access Window</span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base mt-1.5">{item.webinar.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">Instructor: {item.webinar.speaker_name}</p>
                      </div>

                      <button
                        onClick={() => setSelectedVideo(item)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap self-end sm:self-center"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Watch Recording
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: MY TRANSCRIPTS */}
            {tab === "transcripts" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">My Webinar Transcripts</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Read verbatim session transcripts online or download them for offline research.
                  </p>
                </div>

                <div className="space-y-4">
                  {transcripts.map((item) => (
                    <div
                      key={item.webinar.id}
                      className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">{item.webinar.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">Verbatim transcript with questions and answers</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTranscript(item)}
                          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" /> Read Online
                        </button>
                        <a
                          href="https://customer-assets.academyio.com/transcripts/s-corp-basis-form-7203-transcript.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: PDF DOWNLOADS */}
            {tab === "downloads" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">My PDF Downloads & Resources</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Download instructor presentation slides, audit checklists, and step-by-step calculation worksheets.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: "Form 7203 Complete Audit & Compliance Checklist.pdf",
                      course: "S Corp Basis Analysis: Form 7203 Preparation",
                      size: "2.4 MB",
                      url: "https://customer-assets.academyio.com/resources/form_7203_compliance_checklist.pdf",
                    },
                    {
                      title: "Shareholder Debt Basis Reconstruction Worksheet.xlsx / PDF",
                      course: "S Corp Basis Analysis: Form 7203 Preparation",
                      size: "1.8 MB",
                      url: "https://customer-assets.academyio.com/resources/shareholder_debt_basis_worksheet.pdf",
                    },
                    {
                      title: "ASC 606 & ASC 842 Practice Handbook & Decision Trees.pdf",
                      course: "GAAP Financial Accounting Standards Update 2026",
                      size: "4.2 MB",
                      url: "https://customer-assets.academyio.com/resources/gaap_asc606_asc842_handbook.pdf",
                    },
                  ].map((res, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{res.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {res.course} • <span className="font-semibold text-gray-600">{res.size}</span>
                          </p>
                        </div>
                      </div>

                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download File
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: MY ORDERS */}
            {tab === "orders" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">Order History & Invoices</h2>
                  <p className="text-xs text-gray-500 mt-1">Review your past transactions, payment status, and invoices.</p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      orderId: "order_demo_1001",
                      date: "Oct 11, 2026",
                      item: "S Corp Basis Analysis: Form 7203 Preparation - Complete Package",
                      amount: "$249.00 USD",
                      status: "Paid & Fulfilled",
                    },
                    {
                      orderId: "order_demo_1002",
                      date: "Oct 05, 2026",
                      item: "GAAP Accounting Standards Update 2026 - Recording & PDF Guide",
                      amount: "$168.00 USD",
                      status: "Paid & Fulfilled",
                    },
                  ].map((ord) => (
                    <div key={ord.orderId} className="border border-gray-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-3">
                        <div>
                          <span className="font-bold text-gray-900 uppercase">Order #{ord.orderId}</span>
                          <span className="ml-3 text-gray-400">{ord.date}</span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                          {ord.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{ord.item}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Credit Card • Stripe Payment Verified</p>
                        </div>
                        <span className="font-bold text-base text-gray-900">{ord.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: ACCOUNT PROFILE */}
            {tab === "profile" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">Professional Profile & Settings</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage your contact information, professional licensing details, and notification preferences.
                  </p>
                </div>

                <form className="space-y-4 max-w-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        defaultValue={customer?.first_name || "Jane"}
                        className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        defaultValue={customer?.last_name || "Doe"}
                        className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      defaultValue={customer?.email || "customer@academyio.com"}
                      className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-gray-50"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Professional Credential</label>
                    <input
                      type="text"
                      defaultValue="CPA (Certified Public Accountant)"
                      className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Firm / Organization</label>
                    <input
                      type="text"
                      defaultValue="Doe & Associates CPAs LLP"
                      className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base">{selectedVideo.webinar.title}</h3>
              <button onClick={() => setSelectedVideo(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <div className="text-center p-6 text-white space-y-2">
                <PlayCircle className="w-16 h-16 text-emerald-400 mx-auto animate-pulse" />
                <p className="font-semibold text-sm">HD Recording Stream Loaded</p>
                <p className="text-xs text-gray-300">Resuming playback from your last saved position (00:00:00)</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Instructor: {selectedVideo.webinar.speaker_name} • Full playback controls enabled.
            </p>
          </div>
        </div>
      )}

      {/* Transcript Reader Modal */}
      {selectedTranscript && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedTranscript.webinar.title}</h3>
                <span className="text-xs text-gray-500">Verbatim Session Transcript</span>
              </div>
              <button onClick={() => setSelectedTranscript(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-xl text-xs text-gray-700 leading-relaxed space-y-3 font-mono">
              <p><strong>[00:00:15] Moderator:</strong> Welcome everyone to today's continuing education session. Please note the polling requirements for CPE credit.</p>
              <p><strong>[00:01:40] {selectedTranscript.webinar.speaker_name}:</strong> Thank you. Today we examine the fundamental mechanics of shareholder stock and debt basis reconstruction...</p>
              <p><strong>[00:05:22] {selectedTranscript.webinar.speaker_name}:</strong> Under Section 1367, the strict ordering rules govern every dollar of distributions prior to loss recognition...</p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTranscript(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
