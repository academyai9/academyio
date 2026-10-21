import { fetchWithTimeout } from "@lib/util/fetch"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

export interface SubjectArea {
  id: string
  title: string
  description: string
  icon: string
}

export interface Offering {
  id: string
  title: string
  description: string
  icon: string
}

export interface LearningPillar {
  title: string
  description: string
  icon: string
}

export interface AboutPageData {
  title: string
  tagline: string
  lead_paragraphs: string[]
  who_we_are: {
    intro: string
    subject_areas: SubjectArea[]
    conclusion: string
  }
  offerings: Offering[]
  mission: {
    statement: string
    goals_intro: string
    goals: string[]
  }
  approach: {
    intro: string
    pillars: LearningPillar[]
  }
  commitment: {
    paragraphs: string[]
    policy_links_note: string
  }
  continuing_education: {
    title: string
    paragraphs: string[]
  }
  why_choose: {
    title: string
    benefits: string[]
    conclusion: string
  }
  cta_section: {
    title: string
    paragraphs: string[]
    action_text: string
  }
  contact: {
    title: string
    intro: string
    email: string
    website: string
    appreciation: string
  }
}

export const OFFICIAL_ABOUT_DATA: AboutPageData = {
  title: "About Us",
  tagline: "Empowering Professionals Through Online Learning",
  lead_paragraphs: [
    "Welcome to AcademyIO, your online destination for professional education, expert-led webinars, and digital learning resources. Our goal is to make professional learning convenient, accessible, and relevant for individuals who want to expand their knowledge, strengthen their skills, and stay informed about developments in their industries.",
    "We believe that quality education should be accessible regardless of location. Through online training sessions, recorded webinars, transcripts, and downloadable educational materials, AcademyIO helps professionals learn at their own pace and from wherever they are.",
  ],
  who_we_are: {
    intro:
      "AcademyIO is an online learning platform focused on delivering educational webinars and professional development resources across a range of subject areas, including:",
    subject_areas: [
      {
        id: "accounting-finance",
        title: "Accounting and Finance",
        description: "Professional accounting practices, financial reporting, and related topics.",
        icon: "Calculator",
      },
      {
        id: "taxation",
        title: "Taxation",
        description: "Tax compliance, tax planning, regulations, and updates.",
        icon: "Landmark",
      },
      {
        id: "hr-payroll",
        title: "Human Resources and Payroll",
        description: "Workplace practices, payroll administration, employment topics, and compliance.",
        icon: "Users",
      },
      {
        id: "healthcare",
        title: "Healthcare",
        description: "Relevant professional education and industry developments.",
        icon: "HeartPulse",
      },
      {
        id: "housing",
        title: "Housing",
        description: "Housing-related regulations, practices, and professional topics.",
        icon: "Home",
      },
      {
        id: "technology",
        title: "Technology",
        description: "Digital tools, emerging technologies, software, and technology-driven business practices.",
        icon: "Laptop",
      },
    ],
    conclusion:
      "Our educational content is designed to help participants understand complex subjects, explore practical approaches, and keep up with changes that may affect their professional responsibilities.",
  },
  offerings: [
    {
      id: "live-webinars",
      title: "Live Webinars",
      description:
        "Participate in scheduled online training sessions led by knowledgeable speakers and subject-matter experts. Live webinars may include presentations, practical examples, and opportunities to ask questions.",
      icon: "Radio",
    },
    {
      id: "on-demand-learning",
      title: "On-Demand Learning",
      description:
        "Unable to attend a scheduled session? Where available, on-demand training allows you to access recorded educational content at a convenient time, subject to the access terms of the selected program.",
      icon: "PlayCircle",
    },
    {
      id: "webinar-recordings",
      title: "Webinar Recordings",
      description:
        "Access eligible recorded sessions to revisit important concepts and review educational material after the live event.",
      icon: "Film",
    },
    {
      id: "transcripts-downloads",
      title: "Transcripts and Downloadable Resources",
      description:
        "Depending on the selected program, you may also purchase or access transcripts, PDF documents, presentation materials, and other supporting resources for convenient reference.",
      icon: "FileText",
    },
    {
      id: "flexible-options",
      title: "Flexible Learning Options",
      description:
        "We offer different learning and content-access options to suit varying schedules and educational needs. Available formats, prices, delivery timelines, and access periods are displayed with the relevant webinar or product.",
      icon: "Sliders",
    },
  ],
  mission: {
    statement:
      "Our mission is to make professional education more accessible through convenient online learning experiences and useful educational resources.",
    goals_intro: "We aim to help professionals:",
    goals: [
      "Develop their knowledge and understanding of important industry topics.",
      "Stay informed about relevant rules, regulations, and emerging practices.",
      "Learn from experienced presenters and subject-matter specialists.",
      "Access educational content from different locations.",
      "Revisit key concepts through available recordings and learning materials.",
      "Make informed decisions in their professional and business activities.",
    ],
  },
  approach: {
    intro:
      "At AcademyIO, we believe effective professional learning should be practical, convenient, and focused on the needs of participants. Our approach emphasizes:",
    pillars: [
      {
        title: "Accessible Education",
        description: "Online learning that allows participants to engage from their preferred locations.",
        icon: "Globe",
      },
      {
        title: "Relevant Topics",
        description: "Educational programs covering important professional subjects and developments.",
        icon: "Target",
      },
      {
        title: "Expert-Led Presentations",
        description: "Opportunities to learn from speakers with relevant knowledge and experience.",
        icon: "Award",
      },
      {
        title: "Flexible Access",
        description: "Live and recorded learning options when offered for a particular program.",
        icon: "Clock",
      },
      {
        title: "Useful Resources",
        description: "Supporting materials that help participants review and reference the content covered in a session.",
        icon: "BookOpen",
      },
      {
        title: "Participant Support",
        description: "Assistance with registration, payments, webinar access, and educational resources.",
        icon: "Headphones",
      },
    ],
  },
  commitment: {
    paragraphs: [
      "We are committed to providing a straightforward learning experience, from discovering a webinar to completing registration and accessing purchased materials.",
      "Our team works to provide clear program information, transparent product options, and support when participants need assistance. We encourage customers to review each webinar's description, schedule, available materials, and applicable terms before purchasing.",
      "We also recognize the importance of protecting customer information and handling account and transaction details responsibly.",
    ],
    policy_links_note: "For more information, please review our Privacy Policy and Terms & Conditions.",
  },
  continuing_education: {
    title: "Professional Development and Continuing Education",
    paragraphs: [
      "Professional development is an ongoing process. AcademyIO provides educational programs that may help participants build knowledge in their chosen fields.",
      "Where a webinar offers continuing professional education (CPE) or other educational credits, the applicable credit details, field of study, delivery method, and eligibility information should be provided on the individual program page.",
      "Credit availability depends on the specific program and applicable requirements. Participants should review the relevant details before registering and confirm any licensing or credential requirements with the appropriate professional authority.",
    ],
  },
  why_choose: {
    title: "Why Choose AcademyIO?",
    benefits: [
      "A range of professional and industry-focused educational topics.",
      "Convenient online access to available learning programs.",
      "Live and recorded webinar options where offered.",
      "Supporting transcripts and downloadable resources for selected programs.",
      "Clear product and registration information.",
      "Customer support for order and access-related questions.",
    ],
    conclusion: "Our aim is to help make continuing learning a manageable part of your professional journey.",
  },
  cta_section: {
    title: "Join the AcademyIO Learning Community",
    paragraphs: [
      "Whether you are looking to strengthen your existing knowledge, explore a new professional topic, or access educational resources for your work, AcademyIO invites you to explore our available programs.",
      "Discover upcoming webinars, review the available learning options, and choose the educational resources that best suit your needs.",
      "Start learning with AcademyIO today.",
    ],
    action_text: "Explore our webinars and take the next step in your professional development.",
  },
  contact: {
    title: "Contact Us",
    intro: "Have questions about our webinars, registration, educational resources, or services? Our support team is here to help.",
    email: "support@academyio.com",
    website: "AcademyIO",
    appreciation: "Thank you for choosing AcademyIO as part of your professional learning journey.",
  },
}

export async function getAboutData(): Promise<AboutPageData> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/store/pages/about`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      next: { revalidate: 60 },
    })

    if (res.ok) {
      const data = await res.json()
      if (data.page) {
        return {
          ...OFFICIAL_ABOUT_DATA,
          ...data.page,
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch dynamic about page from backend, using official copy fallback:", err)
  }

  return OFFICIAL_ABOUT_DATA
}
