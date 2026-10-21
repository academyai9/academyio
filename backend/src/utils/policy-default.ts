export interface PolicySection {
  id: string
  number: number
  title: string
  subtitle?: string
  content: string[]
  items?: string[]
  followup?: string
}

export interface SummaryRule {
  situation: string
  resolution: string
  timeline: string
}

export interface PolicyPageData {
  id: string
  slug: string
  title: string
  subtitle: string
  support_email: string
  effective_date: string
  version: number
  is_published: boolean
  published_at?: string
  updated_at?: string
  sections: PolicySection[]
  summary_rules: SummaryRule[]
}

export const DEFAULT_REFUND_POLICY: PolicyPageData = {
  id: "page_refund_policy",
  slug: "refund-policy",
  title: "Refund Policy",
  subtitle:
    "At AcademyIO, we are committed to providing a valuable and reliable learning experience through our live webinars, on-demand training, and professional educational resources. We understand that plans can change. This Refund Policy explains the terms and conditions that apply to cancellations, rescheduling, refunds, and access to webinar recordings. Please review this policy carefully before completing your purchase.",
  support_email: "support@academyio.com",
  effective_date: "October 14, 2026",
  version: 1,
  is_published: true,
  summary_rules: [
    {
      situation: "Customer Cancellation (Live & On-Demand)",
      resolution: "Credit note valid for 6 months toward future events",
      timeline: "Notify AcademyIO at least 48 hours (2 working days) before start",
    },
    {
      situation: "Late Cancellation (< 48 hrs) or No-Show",
      resolution: "Non-refundable under standard policy; recording provided after 7 working days where available",
      timeline: "Requests submitted after the 48-hour deadline",
    },
    {
      situation: "Webinar Cancellation by AcademyIO",
      resolution: "100% Full Refund to original payment method",
      timeline: "Processed within 10 working days; notified 24 hrs prior where practicable",
    },
    {
      situation: "Webinar Rescheduling by AcademyIO",
      resolution: "Access to revised date/time or complimentary recording access",
      timeline: "Notified at least 24 hours prior to original start time",
    },
    {
      situation: "Joining Instructions or Technical Inquiries",
      resolution: "Direct support assistance and alternate access verification",
      timeline: "Contact support@academyio.com before the event",
    },
  ],
  sections: [
    {
      id: "sec_1",
      number: 1,
      title: "Cancellation, Rescheduling, and Refund Policy",
      subtitle: "Live and On-Demand Webinars",
      content: [
        "If you wish to cancel your registration for a live or on-demand webinar, you must notify AcademyIO at least 48 hours (two working days) before the scheduled event start time.",
        "For eligible cancellations made within this period, AcademyIO will issue a credit note that can be used toward a future event. The credit note will remain valid for six months from the date of issuance.",
        "If you cancel after the permitted cancellation deadline or do not attend the webinar, refund requests will not be processed under this standard cancellation policy.",
        "Where available, AcademyIO may provide access to the webinar recording as an alternative. For eligible live webinar registrations, the on-demand recording may be provided after seven working days from the event date.",
      ],
    },
    {
      id: "sec_2",
      number: 2,
      title: "Webinar Cancellation by AcademyIO",
      content: [
        "AcademyIO reserves the right to cancel or reschedule a live or on-demand webinar due to insufficient registrations, instructor illness, or unforeseen circumstances beyond our control.",
        "In such cases, registered attendees will be notified, where practicable, at least 24 hours before the scheduled event start time.",
        "If AcademyIO cancels a webinar, registered attendees will be eligible for a full refund of the amount paid for that webinar. Refunds will be processed within 10 working days.",
      ],
    },
    {
      id: "sec_3",
      number: 3,
      title: "Webinar Rescheduling",
      content: [
        "If AcademyIO reschedules a webinar, registered attendees will be informed of the revised date and time, where practicable, at least 24 hours before the original scheduled start time.",
        "If you cannot attend the rescheduled session, AcademyIO may provide access to the webinar recording where available.",
        "Please contact our support team if you are unable to attend the revised session so we can review the available options.",
      ],
    },
    {
      id: "sec_4",
      number: 4,
      title: "Email Delivery and Webinar Access",
      content: [
        "AcademyIO sends webinar registration confirmations, joining instructions, and other relevant information to the email address provided during registration.",
        "We cannot guarantee delivery when emails are blocked, filtered, delayed, or rejected by your email provider or organization's firewall or spam filters.",
        "To help ensure successful delivery, please check your inbox, spam, and junk folders and ask your organization's IT team to allow emails from our official website domain.",
        "If you have not received your registration confirmation or webinar joining instructions, please contact support@academyio.com before the event.",
      ],
    },
    {
      id: "sec_5",
      number: 5,
      title: "Technical Requirements and Customer-Side Issues",
      content: [
        "Customers are responsible for ensuring that their devices, internet connection, browser, and other technical requirements are suitable for attending an online webinar.",
        "AcademyIO is not responsible for attendance difficulties caused by a customer's local internet connection, device configuration, firewall restrictions, browser problems, or other technical issues outside our reasonable control.",
        "We recommend checking your system and internet connection before the scheduled webinar.",
        "Please contact our support team if you experience technical difficulties accessing a webinar.",
      ],
    },
    {
      id: "sec_6",
      number: 6,
      title: "Webinar Content and Learning Expectations",
      content: [
        "Webinar descriptions, learning objectives, speaker information, and other relevant details are provided to help customers make informed purchasing decisions.",
        "Please review the webinar description and available details carefully before completing your purchase.",
        "Because webinars may reflect the instructor's professional knowledge, experience, and teaching approach, dissatisfaction with the presentation style or subjective expectations alone does not automatically qualify for a refund under this policy.",
        "However, if a webinar is materially different from its advertised description or there is another issue with the service provided, please contact our support team so the matter can be reviewed.",
      ],
    },
    {
      id: "sec_7",
      number: 7,
      title: "How to Request a Refund or Credit Note",
      content: [
        "To request a cancellation, refund review, or credit note, email support@academyio.com.",
        "Please include the following details in your email:",
      ],
      items: [
        "Your full name.",
        "The email address used for registration.",
        "Your order or transaction number.",
        "The webinar title and scheduled date.",
        "A brief explanation of your request.",
      ],
      followup:
        "Our support team will review your request according to this Refund Policy and applicable requirements.",
    },
    {
      id: "sec_8",
      number: 8,
      title: "Refund Processing",
      content: [
        "Where a refund is approved, AcademyIO will initiate processing within the timeframe specified in the applicable section of this policy.",
        "The time it takes for the refunded amount to appear in your account may depend on your payment provider, bank, or payment method.",
      ],
    },
    {
      id: "sec_9",
      number: 9,
      title: "Policy Updates",
      content: [
        "AcademyIO may update this Refund Policy from time to time to reflect changes in our services, operations, or applicable requirements.",
        "The latest version published on this page will apply subject to applicable law and any mandatory consumer rights.",
      ],
    },
    {
      id: "sec_10",
      number: 10,
      title: "Contact Us",
      content: [
        "If you have questions about this Refund Policy, cancellations, webinar access, or refund requests, please contact:",
        "AcademyIO Support",
        "Email: support@academyio.com",
        "Website: AcademyIO",
        "We are committed to reviewing customer concerns fairly and providing clear information about our cancellation and refund procedures.",
      ],
    },
  ],
}
