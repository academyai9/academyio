import { fetchWithTimeout } from "@lib/util/fetch"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface FaqItem {
  id: string
  number: number
  question: string
  category: "Webinar Formats" | "Registration & Access" | "CPE & Credits" | "Materials & Delivery" | "Payments & Refunds" | "Technical & Support"
  paragraphs: string[]
  list?: {
    intro?: string
    items: string[]
  }
  followup?: string
}

export interface FaqPageData {
  title: string
  subtitle: string
  support_email: string
  last_updated: string
  items: FaqItem[]
}

export const OFFICIAL_FAQS: FaqPageData = {
  title: "Frequently Asked Questions (FAQs)",
  subtitle:
    "Welcome to AcademyIO! Find answers to common questions about our live webinars, on-demand training, recordings, transcripts, registration, payments, educational credits, and course materials. If you need additional assistance, please contact our support team at support@academyio.com.",
  support_email: "support@academyio.com",
  last_updated: "October 14, 2026",
  items: [
    {
      id: "faq-1",
      number: 1,
      category: "Webinar Formats",
      question: "What is a webinar?",
      paragraphs: [
        "A webinar is an online educational event that allows participants to learn remotely from industry professionals and subject-matter experts. AcademyIO offers online training sessions designed to help participants develop their knowledge and skills in relevant professional fields.",
        "Depending on the webinar, you may be able to attend a live presentation, participate in a question-and-answer session, or access available recordings and educational materials.",
      ],
    },
    {
      id: "faq-2",
      number: 2,
      category: "Webinar Formats",
      question: "What is an On-Demand Webinar?",
      paragraphs: [
        "An On-Demand Webinar allows you to access a recorded training session after the live event has taken place, subject to the access terms listed on the webinar page.",
        "This option is suitable for participants who cannot attend at the scheduled time. Access duration, availability, and delivery instructions will be specified for the particular webinar or product you purchase.",
      ],
    },
    {
      id: "faq-3",
      number: 3,
      category: "Webinar Formats",
      question: "What is a Recording – Single License?",
      paragraphs: [
        "A Recording – Single License provides access to a webinar recording for one authorized individual, subject to the terms of the selected product.",
        "After the recording becomes available, AcademyIO will provide access instructions by email or through your customer account, depending on the product.",
        "Access may be limited to a specified period, such as seven days, when stated on the webinar page. A single-user license does not authorize redistribution or sharing with unauthorized users.",
      ],
    },
    {
      id: "faq-4",
      number: 4,
      category: "Webinar Formats",
      question: "What is a webinar transcript?",
      paragraphs: [
        "A transcript is a written version of the spoken content from a webinar. Depending on the product, it may include supporting handouts or related educational materials in PDF format.",
        "Transcripts are provided when offered as a purchase option and are generally delivered after the live session has taken place.",
      ],
    },
    {
      id: "faq-5",
      number: 5,
      category: "Webinar Formats",
      question: "What is a Web Download?",
      paragraphs: [
        "A Web Download is a downloadable digital product that may include a webinar recording and associated handouts or presentation materials.",
        "When this option is available, AcademyIO will provide download instructions or a download link by email or through your customer account. You can save the permitted files to your device for personal use, subject to the applicable license terms.",
        "File formats, download availability, and access restrictions may vary by product.",
      ],
    },
    {
      id: "faq-6",
      number: 6,
      category: "Registration & Access",
      question: "How do I register for a webinar or course?",
      paragraphs: [
        "To register:",
      ],
      list: {
        items: [
          "Browse the available webinars and courses on AcademyIO.",
          "Select the topic that interests you.",
          "Review the event details, schedule, speaker information, and available purchase options.",
          "Select your preferred option, such as Live Webinar, Recording, Transcript, or another available product.",
          "Add the selected item to your cart and complete checkout.",
          "Check your registered email address for your order confirmation and further instructions.",
        ],
      },
      followup: "Your registration is confirmed according to the order and payment status displayed by AcademyIO.",
    },
    {
      id: "faq-7",
      number: 7,
      category: "Registration & Access",
      question: "When will I receive my webinar access information and materials?",
      paragraphs: [
        "For live webinars, joining instructions are generally sent to your registered email address before the scheduled event, typically within 24 hours of the start time.",
        "Materials may be made available before the session or delivered according to the instructions provided for the specific webinar.",
        "Please check your inbox, spam, junk, and promotions folders. If you have not received your information, contact support@academyio.com and include your order number and registered email address.",
      ],
    },
    {
      id: "faq-8",
      number: 8,
      category: "Registration & Access",
      question: "What if I cannot attend the live webinar?",
      paragraphs: [
        "If you cannot attend a live webinar, check whether a recording or On-Demand option is included with your purchase or is available separately.",
        "If you need assistance with your registration, recording access, or an alternative arrangement, contact support@academyio.com. Availability of recordings and alternative access depends on the specific webinar and its purchase terms.",
      ],
    },
    {
      id: "faq-9",
      number: 9,
      category: "Registration & Access",
      question: "Can I transfer my registration to a colleague?",
      paragraphs: [
        "Registration and access rights depend on the product and its license terms. If you would like to transfer a registration to another participant, contact support@academyio.com before the event.",
        "Please provide your order number, the current participant's details, and the proposed participant's name and email address. Transfers are subject to approval and any applicable event restrictions.",
      ],
    },
    {
      id: "faq-10",
      number: 10,
      category: "CPE & Credits",
      question: "How many CPE credits does a webinar offer?",
      paragraphs: [
        "CPE credit availability and the number of credits awarded depend on the individual program's approved instructional content, duration, field of study, delivery method, and applicable requirements.",
        "Where applicable, AcademyIO displays the relevant credit information on the webinar details page. Please review that information before registering.",
        "For programs governed by NASBA, the IRS, or another credentialing authority, credit eligibility and calculation must follow the applicable program and authority requirements. Not every webinar necessarily qualifies for CPE credit.",
      ],
    },
    {
      id: "faq-11",
      number: 11,
      category: "CPE & Credits",
      question: "How do I ask the speaker a question?",
      paragraphs: [
        "For live webinars that include a question-and-answer session, the moderator will explain how to submit questions. Depending on the event, you may be able to ask questions through the webinar platform's Q&A feature, chat, or another designated method.",
        "The time allocated for questions may vary by presentation. Questions may be answered during the session or handled according to the speaker's available time.",
      ],
    },
    {
      id: "faq-12",
      number: 12,
      category: "Materials & Delivery",
      question: "When will I receive my recording, transcript, or downloadable materials?",
      paragraphs: [
        "Delivery times depend on the product purchased and the availability of the relevant materials:",
      ],
      list: {
        items: [
          "Live Webinar: Joining instructions are generally emailed before the scheduled session.",
          "On-Demand Webinar: Access is provided according to the product's stated availability and access period.",
          "Recording – Single License: Recording access is provided once the recording is available, subject to the stated license period.",
          "Transcript: Delivery may take up to seven working days after the live session when stated in the product details.",
          "Web Download: Download instructions are provided when the files are available, according to the product's delivery terms.",
        ],
      },
      followup: "Please refer to your webinar page, order confirmation, and access email for the specific delivery timeline. If your product is overdue, contact support@academyio.com.",
    },
    {
      id: "faq-13",
      number: 13,
      category: "Payments & Refunds",
      question: "What payment methods does AcademyIO accept?",
      paragraphs: [
        "AcademyIO may support payment methods such as major credit and debit cards and PayPal, depending on the options enabled at checkout.",
        "The payment methods currently available for your order will be displayed during checkout. Payments are processed through the applicable payment provider, subject to its terms and security procedures.",
        "If your payment fails or your order status is unclear, please contact our support team before placing another order to help avoid duplicate transactions.",
      ],
    },
    {
      id: "faq-14",
      number: 14,
      category: "Materials & Delivery",
      question: "How do I access presentation materials and supporting documents?",
      paragraphs: [
        "If presentation materials, handouts, or other supporting documents are included with your purchase, AcademyIO will provide access instructions by email or through your customer account when the materials become available.",
        "Some materials may be available before the webinar, while others may be provided afterward. Follow the instructions in your registration email or customer dashboard.",
        "If you cannot access the files or have trouble with a download, contact support@academyio.com.",
      ],
    },
    {
      id: "faq-15",
      number: 15,
      category: "Registration & Access",
      question: "Is one registration valid for one person?",
      paragraphs: [
        "Unless the product explicitly states otherwise, an individual registration or single-user license is intended for one participant.",
        "If you want to register multiple attendees from the same organization, review the available group-registration options or contact support@academyio.com to ask whether group pricing or multi-attendee access is available.",
        "Please do not share individual login credentials or single-user access links with unauthorized participants.",
      ],
    },
    {
      id: "faq-16",
      number: 16,
      category: "Payments & Refunds",
      question: "What is AcademyIO's refund policy?",
      paragraphs: [
        "Refund eligibility depends on the product purchased, the timing of your request, and the applicable terms.",
        "Please review the Refund Policy page on AcademyIO for information about cancellation deadlines, eligible refunds, credits, rescheduling, and other conditions.",
        "For questions about a specific order or to submit a refund request, contact support@academyio.com with your order number and reason for the request.",
      ],
    },
    {
      id: "faq-17",
      number: 17,
      category: "Registration & Access",
      question: "I missed the live webinar. What should I do?",
      paragraphs: [
        "If you missed a live webinar, first check your customer account and email for recording or On-Demand access information.",
        "If a recording is included with your purchase or otherwise available, follow the instructions provided. If you cannot find the access details, contact support@academyio.com.",
        "Recording availability and access duration depend on the terms of the individual webinar or product.",
      ],
    },
    {
      id: "faq-18",
      number: 18,
      category: "Registration & Access",
      question: "How do I access a live webinar after registering?",
      paragraphs: [
        "After completing your registration and payment, check your registered email address for the confirmation and joining instructions. Before the event:",
      ],
      list: {
        items: [
          "Confirm the webinar date and time, including the applicable time zone.",
          "Check your inbox and spam or junk folders for the joining email.",
          "Open the joining link at the time specified in the instructions.",
          "Follow any platform-specific steps to join the session.",
        ],
      },
      followup: "If you have not received your joining link before the event, contact support@academyio.com and provide your order number, webinar title, and registered email address.",
    },
    {
      id: "faq-19",
      number: 19,
      category: "Technical & Support",
      question: "What should I do if I have a technical problem?",
      paragraphs: [
        "If you experience difficulty accessing a webinar or downloading materials, try checking your internet connection, updating your browser, and reopening the access link.",
        "You should also verify that you are using the correct registered email address and that your purchase includes the relevant access rights.",
        "If the issue continues, email support@academyio.com with your order number, webinar title, a description of the problem, and any relevant error message. Please do not include your password or full payment card details.",
      ],
    },
    {
      id: "faq-20",
      number: 20,
      category: "Technical & Support",
      question: "How can I contact AcademyIO?",
      paragraphs: [
        "Our support team can help with registration, payments, webinar access, course materials, recording availability, transcripts, and other order-related questions.",
        "Email: support@academyio.com",
        "When contacting us, include your name, registered email address, order number if available, and the webinar or product title so we can assist you more efficiently.",
      ],
    },
  ],
}

export async function getFaqs(): Promise<FaqPageData> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/pages/faq`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 60 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data.page && Array.isArray(data.page.items)) {
        return {
          title: data.page.title || OFFICIAL_FAQS.title,
          subtitle: data.page.subtitle || OFFICIAL_FAQS.subtitle,
          support_email: data.page.support_email || OFFICIAL_FAQS.support_email,
          last_updated: data.page.effective_date || OFFICIAL_FAQS.last_updated,
          items: data.page.items,
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch dynamic faqs from backend, using official copy fallback:", err)
  }

  return OFFICIAL_FAQS
}
