import React from "react"
import { HelpCircle, ChevronDown } from "lucide-react"

const FAQS = [
  {
    q: "How do I earn CPE credit during a live webinar?",
    a: "During the live broadcast, interactive polling questions will appear on your screen at random intervals (at least 3-4 polls per 50 minutes of instruction). You must answer the required percentage of polls to verify active attendance. Your completion certificate will be automatically generated in your dashboard upon session conclusion.",
  },
  {
    q: "When and where do I receive the live webinar joining link?",
    a: "Your live link is securely delivered to your personal Customer Dashboard under 'My Live Webinars'. For confirmed, paid orders, the organizer publishes the link 24 to 48 hours prior to the session start. You can also join directly on the day of the event.",
  },
  {
    q: "How long do I have access to recorded webinars and study materials?",
    a: "When you purchase a Recorded Webinar, you receive 1 full year of unlimited, high-definition on-demand streaming access. All downloadable PDF study guides, spreadsheets, and verbatim transcripts are yours to keep permanently.",
  },
  {
    q: "Can I buy a bundle for multiple team members at my firm?",
    a: "Each individual purchase grants a personal license for one registered attendee to access live streams and earn accredited CPE certificates. For corporate multi-seat discounts or firm-wide passes, please contact our support team.",
  },
  {
    q: "What is your refund and cancellation policy?",
    a: "We offer a 100% money-back guarantee on live webinars cancelled at least 24 hours prior to the scheduled broadcast. If you miss a live session due to unexpected client commitments, you can easily exchange your enrollment for the full recording and resource package at no additional cost.",
  },
  {
    q: "What technology or software do I need to attend?",
    a: "Our sessions stream directly in your modern web browser (Chrome, Edge, Safari, Firefox) on both desktop and mobile devices. No proprietary software downloads are required.",
  },
]

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Help & Answers</span>
        <h1 className="text-3xl font-extrabold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Find clear answers regarding CPE certification, session links, video playback, and billing.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-2">
            <h3 className="font-bold text-base text-gray-900 flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <span>{faq.q}</span>
            </h3>
            <p className="text-xs text-gray-600 pl-7 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
