import { fetchWithTimeout } from "@lib/util/fetch"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@lib/config-env"

export interface TermsSubsection {
  number: string
  title: string
  content: string[]
  items?: string[]
}

export interface TermsSection {
  id: string
  number: number
  title: string
  intro?: string
  content?: string[]
  items?: string[]
  subsections?: TermsSubsection[]
}

export interface TermsPageData {
  title: string
  last_updated: string
  lead_paragraphs: string[]
  sections: TermsSection[]
  acceptance_statement: string
  support_email: string
}

export const OFFICIAL_TERMS_CONDITIONS: TermsPageData = {
  title: "Terms & Conditions",
  last_updated: "October 14, 2026",
  lead_paragraphs: [
    "Welcome to AcademyIO. These Terms & Conditions govern your access to and use of the AcademyIO website, online training programs, live webinars, on-demand courses, digital resources, and related services.",
    "By accessing our website, creating an account, purchasing a webinar, or subscribing to a membership plan, you acknowledge that you have read and understood these Terms & Conditions and agree to be bound by them. If you do not agree with these terms, please do not use our website or services.",
    "In these Terms & Conditions, “AcademyIO,” “we,” “us,” and “our” refer to the operator of the AcademyIO website. “You,” “your,” “user,” and “customer” refer to anyone accessing or using our website or services.",
  ],
  support_email: "support@academyio.com",
  acceptance_statement:
    "By accessing the AcademyIO website, registering for an account, purchasing a course or webinar, or subscribing to a membership plan, you acknowledge that you have read and understood these Terms & Conditions and agree to comply with the provisions applicable to your use of our services, subject to your rights under applicable law.",
  sections: [
    {
      id: "section-1",
      number: 1,
      title: "Membership Terms and Usage Rights",
      subsections: [
        {
          number: "1.1",
          title: "Membership Duration",
          content: [
            "Membership access is determined by the subscription or membership plan you purchase. Your membership begins when your purchase is successfully completed and the applicable access is activated.",
            "When your membership expires or is canceled, access to membership-restricted courses and resources may end, even if you previously completed a course during your membership period.",
            "To continue accessing membership content, you must renew your membership or purchase any applicable access extension offered by AcademyIO.",
            "The specific duration, renewal terms, pricing, and included benefits of each membership plan will be described at the time of purchase.",
          ],
        },
        {
          number: "1.2",
          title: "Membership Cancellation and Refunds",
          content: [
            "Membership cancellation and refund requests are governed by our Refund Policy and the terms displayed for the membership plan at checkout.",
            "Because memberships provide access to digital content, certain purchases may be non-refundable once access has been activated, subject to applicable law and any refund terms expressly offered by AcademyIO.",
            "Canceling a recurring subscription generally stops future renewals; it does not automatically guarantee a refund for the current billing period. The effective cancellation date and remaining access will depend on the plan purchased and the applicable terms.",
          ],
        },
        {
          number: "1.3",
          title: "Account Access Policy",
          content: [
            "Memberships and individual user accounts are intended for the person who purchased or registered for the service, unless a group or multi-attendee license expressly permits multiple users.",
            "You may not share your personal login credentials or allow unauthorized individuals to access membership-restricted content.",
            "AcademyIO may investigate suspected account sharing, unauthorized access, or misuse. Where justified, we may restrict, suspend, or terminate access in accordance with these terms and applicable law.",
          ],
        },
        {
          number: "1.4",
          title: "Course and Recording Restrictions",
          content: [
            "Unless expressly permitted by AcademyIO or the applicable license, you may not:",
          ],
          items: [
            "Record, copy, reproduce, or redistribute live webinars or course videos.",
            "Download content that is not explicitly offered for download.",
            "Share recordings, transcripts, presentation materials, or paid resources with unauthorized persons.",
            "Resell, sublicense, publish, or commercially exploit AcademyIO content.",
            "Upload or distribute AcademyIO content on other websites, platforms, or file-sharing services.",
            "Circumvent technical restrictions used to protect our digital content.",
            "Downloadable resources may be used only within the license and permissions specified for the relevant product.",
          ],
        },
        {
          number: "1.5",
          title: "Membership Support",
          content: [
            "For questions about membership access, subscriptions, billing, or purchased resources, contact us at support@academyio.com.",
          ],
        },
      ],
    },
    {
      id: "section-2",
      number: 2,
      title: "Access to the Website and Content",
      subsections: [
        {
          number: "2.1",
          title: "Informational Purpose",
          content: [
            "Information published on AcademyIO is intended for educational and informational purposes. Unless expressly stated otherwise, website content should not be interpreted as personalized legal, tax, accounting, financial, medical, or other professional advice.",
            "You are responsible for determining whether the information is appropriate for your circumstances. Where necessary, seek advice from a qualified professional.",
          ],
        },
        {
          number: "2.2",
          title: "Website Updates",
          content: [
            "We continually work to improve our website and services. We may update course descriptions, website features, content presentation, technical specifications, and other information from time to time.",
            "We make reasonable efforts to keep website information current, but some information may change or become outdated. Material changes affecting a purchased service will be handled in accordance with applicable law and the terms applicable to that purchase.",
          ],
        },
        {
          number: "2.3",
          title: "Website Availability",
          content: [
            "We aim to provide reliable access to AcademyIO but cannot guarantee that the website or every service will always be available without interruption.",
            "Access may occasionally be suspended or restricted for maintenance, security updates, technical problems, service-provider disruptions, or other operational reasons.",
            "Where reasonably practicable, we will work to minimize disruption and restore affected services.",
          ],
        },
        {
          number: "2.4",
          title: "Third-Party Content and Links",
          content: [
            "Our website may include information, presentation materials, external links, or resources supplied by speakers, instructors, partners, or other third parties.",
            "Third-party content remains the responsibility of its respective provider. We do not automatically endorse external content or guarantee its accuracy, completeness, availability, or suitability.",
            "External websites are subject to their own terms and privacy policies.",
          ],
        },
        {
          number: "2.5",
          title: "Disclaimer of Warranties",
          content: [
            "To the extent permitted by applicable law, AcademyIO services and website content are provided on an “as available” basis. We do not guarantee that the website will always be uninterrupted, error-free, or free from harmful technical components.",
            "Nothing in these Terms & Conditions excludes any warranty or consumer right that cannot legally be excluded.",
          ],
        },
        {
          number: "2.6",
          title: "Limitation of Liability",
          content: [
            "To the extent permitted by applicable law, AcademyIO will not be liable for indirect or consequential losses, including loss of profits, business opportunities, anticipated savings, goodwill, or data arising from the use of our website or services.",
            "This provision does not exclude or limit liability where such exclusion or limitation is prohibited by law, including applicable rights relating to fraud, willful misconduct, or other non-excludable liability.",
          ],
        },
      ],
    },
    {
      id: "section-3",
      number: 3,
      title: "Intellectual Property Rights",
      subsections: [
        {
          number: "3.1",
          title: "Ownership of Content",
          content: [
            "Unless otherwise identified, AcademyIO website content and materials, including text, graphics, branding, photographs, illustrations, software, course materials, and website design, are owned by AcademyIO or licensed to us by the relevant rights holders.",
            "Speakers and third-party content providers may retain rights to their own presentations, recordings, and materials.",
            "All applicable copyright, trademark, and other intellectual property rights remain with their respective owners.",
          ],
        },
        {
          number: "3.2",
          title: "Permitted Personal Use",
          content: [
            "Subject to the applicable product license, you may access purchased courses and resources for your personal learning or authorized professional use.",
            "You may download or print resources only when the relevant product expressly permits it. Any permitted use remains subject to copyright notices and other restrictions displayed with the material.",
          ],
        },
        {
          number: "3.3",
          title: "Prohibited Use",
          content: [
            "Without the prior written permission of the relevant rights holder, you may not reproduce, modify, distribute, publish, sell, sublicense, publicly display, or create derivative works from protected content except where permitted by law or an applicable license.",
            "You may not remove copyright notices or use AcademyIO trademarks, logos, or branding in a manner that implies an unauthorized affiliation or endorsement.",
          ],
        },
        {
          number: "3.4",
          title: "Third-Party Rights",
          content: [
            "Certain products may contain materials owned by speakers, instructors, publishers, or other third parties. Your access to those materials does not transfer ownership or grant rights beyond the permissions expressly provided.",
          ],
        },
      ],
    },
    {
      id: "section-4",
      number: 4,
      title: "User Registration and Accounts",
      subsections: [
        {
          number: "4.1",
          title: "Registration Information",
          content: [
            "When registering for AcademyIO, you must provide accurate and complete information, which may include your name, email address, and account credentials.",
            "You must not impersonate another person, use an unauthorized identity, or provide information intended to mislead AcademyIO or other users.",
          ],
        },
        {
          number: "4.2",
          title: "Maintaining Account Information",
          content: [
            "You are responsible for keeping your account information accurate and updating it when necessary.",
            "Incorrect contact details may prevent you from receiving registration confirmations, webinar joining instructions, invoices, certificates, or other account-related communications.",
          ],
        },
        {
          number: "4.3",
          title: "Account Confirmation and Activation",
          content: [
            "Where email verification or another confirmation process is required, you must complete that process before using the relevant account features.",
            "Account activation may be subject to successful registration, payment confirmation, eligibility requirements, and any applicable verification steps.",
          ],
        },
        {
          number: "4.4",
          title: "One Account Per User",
          content: [
            "Unless AcademyIO expressly permits otherwise, each individual should maintain their own user account. Accounts and personal login credentials are not transferable.",
            "Group purchases or multi-attendee plans may allow additional authorized participants according to the terms of the applicable purchase.",
          ],
        },
        {
          number: "4.5",
          title: "Account Security",
          content: [
            "You are responsible for maintaining the confidentiality of your password and other account credentials.",
            "You must promptly notify AcademyIO if you suspect unauthorized access or a security breach involving your account.",
            "We may take reasonable steps to protect accounts, investigate suspicious activity, and prevent unauthorized access.",
          ],
        },
        {
          number: "4.6",
          title: "Age Requirements",
          content: [
            "You must be legally capable of entering into a binding agreement to make purchases on AcademyIO. If you are under the age of majority in your jurisdiction, you may use purchasing services only with the involvement or authorization of a parent or legal guardian where required by law.",
          ],
        },
      ],
    },
    {
      id: "section-5",
      number: 5,
      title: "Username and Password",
      content: [
        "Your username and password are intended for your personal use and must not be shared except where an applicable group license expressly allows additional users.",
        "You are responsible for activity conducted through your account, subject to applicable law and any security obligations that apply to AcademyIO.",
        "You must not attempt to bypass website security, interfere with authentication mechanisms, access restricted areas without authorization, or misuse another user's credentials.",
        "Please contact support@academyio.com promptly if you believe your account has been compromised.",
      ],
    },
    {
      id: "section-6",
      number: 6,
      title: "User-Submitted Information and Conduct",
      subsections: [
        {
          number: "6.1",
          title: "Accuracy of Information",
          content: [
            "You are responsible for ensuring that information you submit to AcademyIO, including registration details, reviews, testimonials, and support requests, is accurate and lawful.",
            "You should update submitted information when necessary.",
          ],
        },
        {
          number: "6.2",
          title: "Prohibited Submissions",
          content: [
            "You must not submit or distribute content that is unlawful, fraudulent, defamatory, abusive, threatening, infringing, or otherwise prohibited by applicable law.",
            "You must not upload malicious software or other material intended to damage, disrupt, or compromise our website or another user's device or account.",
          ],
        },
        {
          number: "6.3",
          title: "Moderation",
          content: [
            "AcademyIO may review, restrict, or remove user-submitted material that violates these terms, infringes third-party rights, threatens security, or creates a risk to other users.",
            "Where appropriate, we may suspend access to related features while investigating a reported issue.",
          ],
        },
        {
          number: "6.4",
          title: "Responsibility for User Content",
          content: [
            "You remain responsible for the content you submit and for ensuring that you have the necessary rights and permissions to submit it.",
            "Nothing in these terms removes any rights or protections you have under applicable law.",
          ],
        },
      ],
    },
    {
      id: "section-7",
      number: 7,
      title: "Suspension and Termination of Accounts",
      content: [
        "AcademyIO may suspend or terminate an account or restrict access to particular services where reasonably necessary due to suspected fraud, unauthorized content sharing, security risks, non-payment, material breach of these terms, or legal requirements.",
        "Where appropriate and legally permitted, we will provide notice and an opportunity to resolve the issue.",
        "You may request account closure by contacting support@academyio.com or using the account-management features available on the website.",
        "Account closure and subscription cancellation are not necessarily the same process. If you have a recurring subscription, please cancel it separately where required and review the applicable billing terms.",
        "Requests to close accounts or remove personal information will be handled in accordance with our Privacy Policy and applicable law.",
      ],
    },
    {
      id: "section-8",
      number: 8,
      title: "Services and Availability",
      content: [
        "AcademyIO may add, update, modify, or discontinue features, course formats, membership benefits, or other services as our platform evolves.",
        "We will make reasonable efforts to communicate material changes affecting existing purchases where appropriate and as required by law.",
        "Information about available courses, webinar dates, speakers, pricing, included resources, and membership benefits is provided on the relevant product or checkout page.",
        "Access to a service may depend on the purchase option selected, the applicable access period, successful payment, and other disclosed conditions.",
      ],
    },
    {
      id: "section-9",
      number: 9,
      title: "Orders, Payments, and Purchases",
      subsections: [
        {
          number: "9.1",
          title: "Placing an Order",
          content: [
            "When you purchase a webinar, course, subscription, or digital resource, you must provide accurate billing and contact information.",
            "Please review the product description, selected option, price, and applicable terms before submitting your order.",
          ],
        },
        {
          number: "9.2",
          title: "Order Confirmation",
          content: [
            "We will provide an order or purchase confirmation through the communication method available for your transaction, generally by email or through your account.",
            "An order confirmation does not override any payment verification, fraud-prevention, or fulfillment requirements applicable to the transaction.",
          ],
        },
        {
          number: "9.3",
          title: "Payments",
          content: [
            "Payments are processed through the payment methods made available at checkout. These may include third-party payment providers.",
            "Payment processing may be subject to the provider's terms, security checks, and availability.",
            "You authorize the applicable payment provider to process the transaction for the amount displayed at checkout. We will provide access to purchased services in accordance with the applicable order and payment status.",
          ],
        },
        {
          number: "9.4",
          title: "Digital Products and Access",
          content: [
            "AcademyIO primarily provides digital educational products, including live webinars, recordings, transcripts, downloadable resources, and subscription-based access.",
            "Access depends on the product or option purchased. A recording, transcript, presentation, or other resource is not included unless stated in the relevant product description or purchase confirmation.",
          ],
        },
        {
          number: "9.5",
          title: "Refunds and Cancellations",
          content: [
            "Refunds, credit notes, cancellations, and rescheduling are governed by our Refund Policy, together with any applicable product-specific terms disclosed before purchase.",
            "Nothing in these Terms & Conditions limits mandatory rights available to consumers under applicable law.",
          ],
        },
        {
          number: "9.6",
          title: "Taxes and Pricing",
          content: [
            "Prices, applicable taxes, currency, and any additional charges will be displayed at checkout where required and supported by the transaction.",
            "You are responsible for reviewing the final order total before completing your purchase.",
          ],
        },
        {
          number: "9.7",
          title: "No Unauthorized Resale",
          content: [
            "Unless expressly authorized in writing or permitted by the applicable license, purchased digital products are intended for the use described in their product terms and may not be resold, redistributed, or sublicensed.",
          ],
        },
      ],
    },
    {
      id: "section-10",
      number: 10,
      title: "Webinar Participation and Educational Credits",
      subsections: [
        {
          number: "10.1",
          title: "Webinar Registration",
          content: [
            "You are responsible for reviewing the webinar date, time zone, description, prerequisites, learning level, and delivery method before registering.",
            "Joining instructions may be sent to the email address associated with your order. You should check your inbox and spam or junk folders before the scheduled session.",
          ],
        },
        {
          number: "10.2",
          title: "Attendance and Participation",
          content: [
            "Some webinars may require attendance verification, participation in polling questions, completion of a quiz, or other activities to qualify for a certificate or educational credit.",
            "Eligibility requirements will be communicated where applicable. Purchasing a webinar does not automatically guarantee a certificate or credit.",
          ],
        },
        {
          number: "10.3",
          title: "Credits and Certificates",
          content: [
            "Credit types, recommended credit amounts, field of study, attendance requirements, and certificate eligibility may vary by webinar and issuing or recognizing organization.",
            "You are responsible for reviewing the specific information displayed on the relevant webinar page.",
            "AcademyIO will not represent that credits are approved, awarded, or accepted by a professional organization unless the applicable status has been verified and the representation is authorized.",
            "A certificate issued by AcademyIO confirms only the completion or participation described on that certificate. It does not independently guarantee acceptance by an employer, licensing authority, or professional organization.",
          ],
        },
      ],
    },
    {
      id: "section-11",
      number: 11,
      title: "Privacy and Communications",
      content: [
        "Your use of AcademyIO is also governed by our Privacy Policy.",
        "We process personal information in accordance with that policy and applicable law.",
        "We may send transactional communications relating to registration, orders, payments, webinar access, account security, certificates, and support requests.",
        "Marketing communications, where applicable, are subject to the preferences and choices available to you and applicable legal requirements.",
      ],
    },
    {
      id: "section-12",
      number: 12,
      title: "Changes to These Terms",
      content: [
        "AcademyIO may update these Terms & Conditions from time to time to reflect changes in our services, operational practices, or legal requirements.",
        "The latest version will be published on this page with its updated date.",
        "Where required by law, we will provide notice of material changes and obtain any necessary consent. Changes will not retroactively remove rights that cannot lawfully be removed.",
        "Your continued use of AcademyIO after revised terms take effect indicates acceptance where such acceptance is legally valid.",
      ],
    },
    {
      id: "section-13",
      number: 13,
      title: "Events Beyond Our Reasonable Control",
      content: [
        "AcademyIO will not be responsible for delays or failures caused by circumstances beyond our reasonable control, such as major network outages, natural disasters, widespread service-provider disruptions, government restrictions, or other unforeseen events.",
        "Where an event affects a purchased webinar or service, we will make reasonable efforts to communicate the issue and provide any remedy required under our Refund Policy or applicable law.",
      ],
    },
    {
      id: "section-14",
      number: 14,
      title: "General Provisions",
      subsections: [
        {
          number: "14.1",
          title: "Severability",
          content: [
            "If any provision of these Terms & Conditions is held to be invalid or unenforceable, the remaining provisions will continue to apply to the extent permitted by law.",
          ],
        },
        {
          number: "14.2",
          title: "No Waiver",
          content: [
            "Failure to enforce a provision does not automatically waive the right to enforce that provision later.",
          ],
        },
        {
          number: "14.3",
          title: "Assignment",
          content: [
            "You may not transfer your account or contractual rights to another person unless expressly permitted by AcademyIO or the applicable product terms.",
          ],
        },
        {
          number: "14.4",
          title: "Entire Agreement",
          content: [
            "These Terms & Conditions, together with the applicable product terms, Refund Policy, Privacy Policy, and other policies expressly incorporated into the relevant purchase, describe the terms governing your use of AcademyIO.",
            "If a mandatory legal requirement conflicts with a provision in these terms, the applicable legal requirement will prevail.",
          ],
        },
      ],
    },
    {
      id: "section-15",
      number: 15,
      title: "Contact Information",
      content: [
        "If you have questions, concerns, or complaints regarding these Terms & Conditions, your account, membership, webinar registration, or a purchase, please contact:",
        "AcademyIO Support",
        "Email: support@academyio.com",
        "Website: AcademyIO",
        "We will review your inquiry and respond as appropriate.",
      ],
    },
  ],
}

export async function getTermsConditions(): Promise<TermsPageData> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/pages/terms`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data.page && data.page.sections) {
        return {
          title: data.page.title || OFFICIAL_TERMS_CONDITIONS.title,
          last_updated: data.page.effective_date || OFFICIAL_TERMS_CONDITIONS.last_updated,
          lead_paragraphs: OFFICIAL_TERMS_CONDITIONS.lead_paragraphs,
          sections: data.page.sections || OFFICIAL_TERMS_CONDITIONS.sections,
          acceptance_statement: OFFICIAL_TERMS_CONDITIONS.acceptance_statement,
          support_email: data.page.support_email || OFFICIAL_TERMS_CONDITIONS.support_email,
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch dynamic terms from backend, using official copy fallback:", err)
  }

  return OFFICIAL_TERMS_CONDITIONS
}
