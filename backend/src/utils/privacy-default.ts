export interface PrivacySection {
  id: string
  number: number
  title: string
  intro?: string
  content?: string[]
  items?: string[]
  followup?: string[]
}

export interface PrivacyPageData {
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
  sections: PrivacySection[]
}

export const DEFAULT_PRIVACY_POLICY: PrivacyPageData = {
  id: "page_privacy_policy",
  slug: "privacy-policy",
  title: "Privacy Policy",
  subtitle:
    "At AcademyIO, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, disclose, and protect information when you visit our website, create an account, purchase a webinar or educational resource, download content, subscribe to our newsletter, or communicate with our support team. We value your trust and strive to handle your personal information responsibly.",
  support_email: "support@academyio.com",
  effective_date: "October 14, 2026",
  version: 1,
  is_published: true,
  sections: [
    {
      id: "sec_1",
      number: 1,
      title: "Personal Identification Information",
      intro: "AcademyIO may collect personal information from users in various ways, including when users:",
      items: [
        "Visit or interact with our website.",
        "Create an account or register for membership.",
        "Purchase a live webinar, recorded webinar, transcript, PDF, or other educational resource.",
        "Register for a webinar or access a customer dashboard.",
        "Subscribe to our newsletter or other communications.",
        "Complete surveys, submit feedback, or participate in promotions.",
        "Contact our customer support team.",
      ],
      content: [
        "Depending on the service, we may collect your name, email address, billing address, telephone number, account details, transaction information, and other information you voluntarily provide.",
        "You may browse certain areas of our website without creating an account. However, some services and features may require specific information to process your registration, purchase, or access request.",
      ],
    },
    {
      id: "sec_2",
      number: 2,
      title: "Automatically Collected Information",
      intro: "When you visit AcademyIO, our servers and website technologies may automatically collect certain technical information, including:",
      items: [
        "Browser type and version.",
        "Operating system and device information.",
        "Internet Protocol (IP) address.",
        "Pages visited and website interactions.",
        "Referring website or URL.",
        "Date and time of access.",
        "Server requests and response status codes.",
      ],
      content: [
        "We use this information to operate our website, maintain security, troubleshoot technical problems, understand website usage, and improve our services.",
        "We may associate certain technical information with an order or account when necessary for fraud prevention, transaction records, security, or legal compliance.",
      ],
    },
    {
      id: "sec_3",
      number: 3,
      title: "Information You Provide Voluntarily",
      intro: "You may provide personal information when purchasing services, registering for an account, contacting us, or using other features offered by AcademyIO. We primarily use this information to:",
      items: [
        "Create and manage your customer account.",
        "Process orders, payments, and membership registrations.",
        "Provide access to purchased webinars, recordings, transcripts, PDFs, and other resources.",
        "Send webinar registration confirmations, access instructions, receipts, and important service updates.",
        "Respond to customer questions, requests, and complaints.",
        "Maintain order history and customer support records.",
        "Improve our website, educational content, and customer experience.",
        "Detect, investigate, and prevent fraud, unauthorized access, and misuse.",
        "Comply with applicable legal, accounting, tax, and regulatory obligations.",
      ],
      content: [
        "If you do not provide information required for a particular service, we may be unable to complete your registration, process your purchase, or provide that service.",
      ],
    },
    {
      id: "sec_4",
      number: 4,
      title: "Customer Accounts and Account Deletion",
      content: [
        "AcademyIO may allow you to create a password-protected account to manage your profile, view order history, and access eligible purchased resources.",
        "You are responsible for maintaining the confidentiality of your login credentials and notifying us if you suspect unauthorized access to your account.",
        "You may request the deletion of your account by contacting support@academyio.com. We may need to retain certain information for legitimate business purposes, pending transactions, dispute resolution, fraud prevention, recordkeeping, or legal obligations. Where applicable, we will handle deletion requests in accordance with relevant laws.",
        "Deleting an account may affect your ability to access your account history and digital content, subject to applicable legal requirements and any relevant contractual terms.",
      ],
    },
    {
      id: "sec_5",
      number: 5,
      title: "Newsletter and Marketing Communications",
      content: [
        "If you subscribe to the AcademyIO newsletter or opt in to marketing communications, we may use your email address to send educational updates, webinar announcements, new course information, promotions, and other relevant news.",
        "You can unsubscribe from marketing emails at any time by clicking the unsubscribe link included in the email or contacting us at support@academyio.com.",
        "Even if you unsubscribe from marketing communications, we may still send essential transactional or service-related messages, such as order confirmations, payment notifications, account security alerts, and changes affecting a service you purchased.",
        "We do not treat your newsletter subscription as permission to use your information for unrelated purposes beyond those explained in this policy and permitted by applicable law.",
      ],
    },
    {
      id: "sec_6",
      number: 6,
      title: "Sharing Information with Third Parties",
      intro: "AcademyIO does not sell your personal information to third parties for their own direct marketing purposes. We may share information with trusted service providers when reasonably necessary to operate our business and deliver our services. These providers may include:",
      items: [
        "Payment processors: To process payments, refunds, and transaction verification.",
        "Website hosting and technology providers: To maintain our website, databases, and customer accounts.",
        "Email and communication providers: To send order confirmations, webinar links, account notifications, and newsletters.",
        "Analytics and security providers: To understand website performance, prevent fraud, and protect our services.",
        "Professional advisers and authorities: Where necessary for legal compliance, dispute resolution, or the protection of our rights.",
      ],
      content: [
        "We share only the information reasonably necessary for the relevant purpose and expect service providers to handle it in accordance with applicable privacy and security requirements.",
        "We may also disclose information when required by law, in response to valid legal requests, or when necessary to protect users, our business, or the security of our services.",
      ],
    },
    {
      id: "sec_7",
      number: 7,
      title: "Payments and Payment Security",
      content: [
        "AcademyIO may offer payment methods through third-party payment service providers. When you make a purchase, certain transaction details may be shared with the selected provider to process and verify your payment.",
        "Your payment information is handled according to the applicable provider's privacy policy and security practices. Depending on the payment method, AcademyIO may receive transaction identifiers, payment status, billing details, and limited payment-related information.",
        "We do not claim to store or process full payment card details ourselves unless our actual payment infrastructure supports this and the applicable security requirements are met.",
        "You should review the privacy and security policies of your selected payment provider for more information about how it processes payment data.",
      ],
    },
    {
      id: "sec_8",
      number: 8,
      title: "Cookies and Similar Technologies",
      content: [
        "AcademyIO may use cookies and similar technologies to improve website functionality, remember preferences, maintain login sessions, protect accounts, analyze website traffic, and support relevant website features.",
        "Cookies are small text files stored by your browser. Some cookies are necessary for the website to function, while others may support analytics or optional features.",
        "You can manage or disable cookies through your browser settings. Where required by applicable law, we will seek consent before using non-essential cookies or similar technologies.",
        "Disabling certain cookies may prevent some website features from working correctly, including account login, shopping cart functionality, or checkout.",
      ],
    },
    {
      id: "sec_9",
      number: 9,
      title: "Data Security",
      content: [
        "AcademyIO takes reasonable technical and organizational measures designed to protect personal information against unauthorized access, loss, misuse, alteration, and disclosure.",
        "Depending on the service and available infrastructure, these measures may include encrypted connections, access controls, account authentication, secure hosting, and safeguards provided by payment processors.",
        "However, no website, electronic transmission, or storage system can be guaranteed to be completely secure. You should use a strong password, keep your credentials confidential, and contact us promptly if you believe your account has been compromised.",
      ],
    },
    {
      id: "sec_10",
      number: 10,
      title: "Data Retention",
      content: [
        "We retain personal information for as long as reasonably necessary to provide our services, maintain customer accounts, fulfill transactions, manage support requests, comply with legal and accounting obligations, resolve disputes, and protect our business.",
        "Retention periods may vary depending on the type of information, the purpose for which it was collected, and applicable legal requirements.",
        "When information is no longer required, we will take reasonable steps to delete it, anonymize it, or otherwise handle it appropriately, subject to legal and operational requirements.",
      ],
    },
    {
      id: "sec_11",
      number: 11,
      title: "Your Privacy Rights",
      intro: "Depending on your location and applicable law, you may have the right to:",
      items: [
        "Request access to personal information we hold about you.",
        "Request correction of inaccurate or incomplete information.",
        "Request deletion of certain personal information.",
        "Withdraw consent where processing is based on consent.",
        "Object to or request restrictions on certain processing activities.",
        "Request a copy of certain information in a portable format.",
        "Opt out of marketing communications.",
        "Lodge a complaint with a relevant privacy or data protection authority.",
      ],
      content: [
        "To exercise an applicable privacy right, contact us at support@academyio.com. We may request reasonable information to verify your identity before fulfilling a request.",
        "We will respond in accordance with applicable law. Some information may need to be retained where permitted or required by law, or where necessary to complete transactions, prevent fraud, or resolve disputes.",
      ],
    },
    {
      id: "sec_12",
      number: 12,
      title: "Third-Party Websites and Services",
      content: [
        "Our website may contain links to third-party websites, payment services, webinar platforms, or other external resources.",
        "AcademyIO does not control the privacy practices or security of third-party websites. When you visit or use an external service, its own terms and privacy policy may apply.",
        "We encourage you to review the privacy policies of third-party services before submitting personal information to them.",
      ],
    },
    {
      id: "sec_13",
      number: 13,
      title: "Children's Privacy",
      content: [
        "AcademyIO's services are intended for individuals who can legally use and purchase the services under applicable law. Our website is not knowingly designed to collect personal information from children in circumstances where parental consent or other legal authorization is required.",
        "If you believe a child has provided personal information to us inappropriately, please contact support@academyio.com so we can review the matter and take appropriate action.",
      ],
    },
    {
      id: "sec_14",
      number: 14,
      title: "International Data Processing",
      content: [
        "AcademyIO and its service providers may process or store personal information in countries other than the country where you live.",
        "Where international transfers are subject to legal requirements, we will take appropriate steps to handle such transfers in accordance with applicable data protection laws.",
      ],
    },
    {
      id: "sec_15",
      number: 15,
      title: "Changes to This Privacy Policy",
      content: [
        "AcademyIO reserves the right to update this Privacy Policy as our services, technology, business practices, or legal obligations change.",
        "When we make changes, we will update the “Last Updated” date at the top of this page. Where required by law, we will provide additional notice or seek consent for material changes.",
        "Your continued use of our website after an updated policy becomes effective will be subject to applicable law and any consent requirements that apply.",
      ],
    },
    {
      id: "sec_16",
      number: 16,
      title: "Contact Us",
      content: [
        "If you have questions about this Privacy Policy, wish to request access to or correction of your information, or want to submit a privacy-related request, please contact us:",
        "AcademyIO Support Team",
        "Email: support@academyio.com",
        "Please include enough information for us to understand and respond to your request. Do not send passwords, full payment card numbers, or other sensitive authentication information by email.",
        "Thank you for trusting AcademyIO. We are committed to treating your information responsibly and helping you access our educational services with confidence.",
      ],
    },
  ],
}
