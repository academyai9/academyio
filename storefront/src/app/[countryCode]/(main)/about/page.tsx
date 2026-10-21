import React from "react"
import Link from "next/link"
import { Metadata } from "next"
import {
  Sparkles,
  ChevronRight,
  Calculator,
  Landmark,
  Users,
  HeartPulse,
  Home,
  Laptop,
  Radio,
  PlayCircle,
  Film,
  FileText,
  Sliders,
  Globe,
  Target,
  Award,
  Clock,
  BookOpen,
  Headphones,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
  Mail,
  ArrowRight,
  Compass,
} from "lucide-react"
import { getAboutData, SubjectArea, Offering, LearningPillar } from "@lib/data/about"

export const metadata: Metadata = {
  title: "About Us | AcademyIO",
  description:
    "Empowering professionals through online learning. Learn about AcademyIO's live webinars, on-demand courses, expert faculty, and continuing professional education across accounting, tax, HR, healthcare, and technology.",
  openGraph: {
    title: "About Us | AcademyIO",
    description:
      "Discover AcademyIO's mission, expert-led webinars, and flexible professional education resources.",
  },
}

function SubjectIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "Calculator":
      return <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    case "Landmark":
      return <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    case "Users":
      return <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
    case "HeartPulse":
      return <HeartPulse className="w-5 h-5 text-rose-600 dark:text-rose-400" />
    case "Home":
      return <Home className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    case "Laptop":
    default:
      return <Laptop className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
  }
}

function OfferingIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "Radio":
      return <Radio className="w-5 h-5 text-red-500 animate-pulse" />
    case "PlayCircle":
      return <PlayCircle className="w-5 h-5 text-blue-500" />
    case "Film":
      return <Film className="w-5 h-5 text-purple-500" />
    case "FileText":
      return <FileText className="w-5 h-5 text-emerald-500" />
    case "Sliders":
    default:
      return <Sliders className="w-5 h-5 text-indigo-500" />
  }
}

function PillarIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "Globe":
      return <Globe className="w-5 h-5 text-blue-500" />
    case "Target":
      return <Target className="w-5 h-5 text-rose-500" />
    case "Award":
      return <Award className="w-5 h-5 text-purple-500" />
    case "Clock":
      return <Clock className="w-5 h-5 text-amber-500" />
    case "BookOpen":
      return <BookOpen className="w-5 h-5 text-emerald-500" />
    case "Headphones":
    default:
      return <Headphones className="w-5 h-5 text-cyan-500" />
  }
}

export default async function AboutPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const data = await getAboutData()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Link href={`/${countryCode}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-slate-200 font-semibold">About Us</span>
      </nav>

      {/* Hero Header */}
      <header className="space-y-6 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{data.tagline}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-slate-100 tracking-tight leading-tight">
          About AcademyIO
        </h1>

        <div className="space-y-4 text-base sm:text-lg text-gray-700 dark:text-slate-300 leading-relaxed">
          {data.lead_paragraphs.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>

        {/* Quick Highlights Counter Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">6+</span>
            <p className="text-xs font-medium text-gray-600 dark:text-slate-400">Disciplines Covered</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">100%</span>
            <p className="text-xs font-medium text-gray-600 dark:text-slate-400">Online & Accessible</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">Live</span>
            <p className="text-xs font-medium text-gray-600 dark:text-slate-400">& On-Demand Formats</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm text-center space-y-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">CPE</span>
            <p className="text-xs font-medium text-gray-600 dark:text-slate-400">Eligible Programs</p>
          </div>
        </div>
      </header>

      {/* SECTION 1: WHO WE ARE */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Core Disciplines</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            Who We Are
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {data.who_we_are.intro}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.who_we_are.subject_areas.map((subject) => (
            <div
              key={subject.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-blue-300 dark:hover:border-blue-900 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <SubjectIcon icon={subject.icon} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {subject.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                {subject.description}
              </p>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          {data.who_we_are.conclusion}
        </div>
      </section>

      {/* SECTION 2: WHAT WE OFFER */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Comprehensive Learning Suite</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            What We Offer
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            AcademyIO provides multiple flexible options designed to meet your busy professional schedule and continuous learning requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.offerings.map((offering) => (
            <div
              key={offering.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-emerald-300 dark:hover:border-emerald-900 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <OfferingIcon icon={offering.icon} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {offering.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                {offering.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: OUR MISSION */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 sm:p-12 shadow-xl border border-slate-800 space-y-6">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Purpose & Direction</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Our Mission</h2>
          <p className="text-sm sm:text-base text-gray-200 leading-relaxed">
            {data.mission.statement}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-4">
            {data.mission.goals_intro}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.mission.goals.map((goal, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-gray-200 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{goal}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: OUR APPROACH TO LEARNING */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pedagogical Standards</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            Our Approach to Learning
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {data.approach.intro}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.approach.pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                <PillarIcon icon={pillar.icon} />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                {pillar.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: OUR COMMITMENT TO PARTICIPANTS */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            Our Commitment to Participants
          </h2>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          {data.commitment.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
          <p className="pt-2 font-medium">
            For more information, please review our{" "}
            <Link
              href={`/${countryCode}/privacy`}
              className="text-blue-600 dark:text-blue-400 font-bold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href={`/${countryCode}/terms`}
              className="text-blue-600 dark:text-blue-400 font-bold underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Terms & Conditions
            </Link>
            .
          </p>
        </div>
      </section>

      {/* SECTION 6: PROFESSIONAL DEVELOPMENT & CONTINUING EDUCATION */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {data.continuing_education.title}
          </h2>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
          {data.continuing_education.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </section>

      {/* SECTION 7: WHY CHOOSE ACADEMYIO? */}
      <section className="space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Key Advantages</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            {data.why_choose.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.why_choose.benefits.map((benefit, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                {benefit}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 italic pt-1">
          {data.why_choose.conclusion}
        </p>
      </section>

      {/* SECTION 8: JOIN THE COMMUNITY & CALL TO ACTION */}
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 sm:p-12 shadow-xl space-y-6">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black">
            {data.cta_section.title}
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-blue-100 leading-relaxed">
            {data.cta_section.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
          <p className="text-xs sm:text-sm font-semibold text-white pt-2">
            {data.cta_section.action_text}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={`/${countryCode}/webinars`}
            className="px-6 py-3 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <span>Explore Webinars</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/${countryCode}/faq`}
            className="px-6 py-3 rounded-xl bg-blue-800/80 hover:bg-blue-800 text-white font-bold text-xs border border-blue-500/50 transition-all"
          >
            Read FAQs
          </Link>
        </div>
      </section>

      {/* SECTION 9: CONTACT US & GRATITUDE */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Mail className="w-4 h-4" />
            <span>Get In Touch</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100">
            {data.contact.title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 max-w-xl leading-relaxed">
            {data.contact.intro}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500 pt-1">
            {data.contact.appreciation}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            href={`mailto:${data.contact.email}`}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            <span>Email {data.contact.email}</span>
          </a>
          <Link
            href={`/${countryCode}/contact`}
            className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs border border-gray-200 dark:border-slate-700 transition-all"
          >
            Contact Center
          </Link>
        </div>
      </section>
    </div>
  )
}
