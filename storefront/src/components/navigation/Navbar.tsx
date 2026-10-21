"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  ShoppingBag,
  User,
  Calendar,
  BookOpen,
  FolderTree,
  CreditCard,
  Menu,
  X,
  LayoutDashboard,
  ChevronDown,
  LogOut,
  FileText,
  Download,
  PlayCircle,
  Video,
  UserPlus,
  LogIn,
  Award,
  Calculator,
  HeartPulse,
  Building2,
  Users,
  Landmark,
  Cpu,
  ArrowRight,
} from "lucide-react"
import { signout } from "@lib/data/customer"
import ThemeToggle from "@/components/theme/ThemeToggle"

const TOPIC_NAV_ITEMS = [
  { name: "Accounting", slug: "accounting", icon: Calculator, desc: "Accounting principles, reporting & audit" },
  { name: "Healthcare", slug: "healthcare", icon: HeartPulse, desc: "Administration, HIPAA & compliance" },
  { name: "Housing", slug: "housing", icon: Building2, desc: "Section 42, LIHTC & property regulations" },
  { name: "Human Resources & Payroll", slug: "human-resources-payroll", icon: Users, desc: "FLSA, multi-state tax & labor policy" },
  { name: "Taxation", slug: "taxation", icon: Landmark, desc: "IRS forms, tax planning & compliance" },
  { name: "Technology", slug: "technology", icon: Cpu, desc: "AI, cybersecurity & automation tools" },
]

interface NavbarProps {
  countryCode?: string
  customer?: any
}

export default function Navbar({ countryCode = "us", customer }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [topicsMenuOpen, setTopicsMenuOpen] = useState(false)
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const topicsDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (topicsDropdownRef.current && !topicsDropdownRef.current.contains(event.target as Node)) {
        setTopicsMenuOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false)
        setTopicsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const displayName =
    customer?.first_name?.trim() ||
    (customer?.email ? customer.email.split("@")[0] : null) ||
    "Member"

  const customerMenuItems = [
    { label: "My Dashboard", href: `/${countryCode}/dashboard`, icon: LayoutDashboard },
    { label: "My Orders", href: `/${countryCode}/dashboard?tab=orders`, icon: ShoppingBag },
    { label: "My Webinars", href: `/${countryCode}/dashboard?tab=overview`, icon: Video },
    { label: "My Recordings", href: `/${countryCode}/dashboard?tab=recordings`, icon: PlayCircle },
    { label: "My Transcripts", href: `/${countryCode}/dashboard?tab=transcripts`, icon: FileText },
    { label: "Conference Material", href: `/${countryCode}/dashboard?tab=downloads`, icon: Download },
    { label: "My Certificates", href: `/${countryCode}/dashboard?tab=certificates`, icon: Award },
    { label: "My Subscription", href: `/${countryCode}/dashboard?tab=subscription`, icon: CreditCard },
    { label: "My Profile", href: `/${countryCode}/dashboard?tab=profile`, icon: User },
  ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signout(countryCode)
    } catch {
      window.location.href = `/${countryCode}/login?logged_out=true`
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Brand Logo */}
          <Link href={`/${countryCode}`} className="flex items-center group py-1" aria-label="AcademyIO Homepage">
            <img
              src="/logos/academyio-logo.png"
              alt="AcademyIO - Empowering Future Minds"
              className="h-10 sm:h-11 w-auto max-w-[200px] sm:max-w-[230px] object-contain dark:hidden transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <img
              src="/logos/academyio-logo-white.png"
              alt="AcademyIO - Empowering Future Minds"
              className="h-10 sm:h-11 w-auto max-w-[200px] sm:max-w-[230px] object-contain hidden dark:block transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          {/* Exactly 4 Desktop Navigation Items */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-semibold text-gray-700 dark:text-slate-200">
            {/* 1. Upcoming */}
            <Link
              href={`/${countryCode}/webinars/upcoming`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Upcoming</span>
            </Link>

            {/* 2. Self-Study (formerly On-Demand) */}
            <Link
              href={`/${countryCode}/webinars/self-study`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Self-Study</span>
            </Link>

            {/* 3. Courses by Topics with Accessible Dropdown */}
            <div
              className="relative"
              ref={topicsDropdownRef}
              onMouseEnter={() => setTopicsMenuOpen(true)}
              onMouseLeave={() => setTopicsMenuOpen(false)}
            >
              <div className="flex items-center">
                <Link
                  href={`/${countryCode}/courses-by-topics`}
                  className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  <FolderTree className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Courses by Topics</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setTopicsMenuOpen(!topicsMenuOpen)}
                  aria-expanded={topicsMenuOpen}
                  aria-haspopup="true"
                  className="p-1 -ml-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none cursor-pointer"
                  title="Toggle topics menu"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      topicsMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Accessible Dropdown Card */}
              {topicsMenuOpen && (
                <div
                  className="absolute left-0 mt-1 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                      Curriculum Disciplines
                    </span>
                    <Link
                      href={`/${countryCode}/courses-by-topics`}
                      onClick={() => setTopicsMenuOpen(false)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {TOPIC_NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.slug}
                          href={`/${countryCode}/courses-by-topics/${item.slug}`}
                          onClick={() => setTopicsMenuOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-800 dark:text-slate-100 group transition-colors"
                          role="menuitem"
                        >
                          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-gray-600 dark:text-slate-400 transition-colors shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1 leading-snug">
                              {item.desc}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>

                  <div className="p-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 rounded-b-xl">
                    <Link
                      href={`/${countryCode}/courses-by-topics`}
                      onClick={() => setTopicsMenuOpen(false)}
                      className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      <span>Explore All Topics & Filters</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Subscriptions */}
            <Link
              href={`/${countryCode}/subscriptions`}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5 text-blue-700 dark:text-blue-400"
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Subscriptions</span>
            </Link>
          </nav>

          {/* Right Action Controls: Search, ThemeToggle, Cart, Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Search */}
            <Link
              href={`/${countryCode}/search`}
              className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Search webinars"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Theme Toggle (Day & Night Mode) */}
            <ThemeToggle />

            {/* Direct Checkout */}
            <Link
              href={`/${countryCode}/checkout`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-100 transition-colors"
              title="Proceed to Checkout"
            >
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Checkout</span>
            </Link>

            {/* Authentication Buttons / User Dropdown */}
            {customer ? (
              /* LOGGED IN: Welcome, {Name} Dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-gray-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold">Welcome, {displayName}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-500 dark:text-slate-400 transition-transform ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 py-2 z-50 transition-all ${
                    userMenuOpen ? "block" : "hidden"
                  }`}
                >
                  {/* User Profile Card */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {customer.first_name
                        ? `${customer.first_name} ${customer.last_name || ""}`.trim()
                        : displayName}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                      {customer.email}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Verified Customer
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <div className="py-1">
                    {customerMenuItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* LOGGED OUT: Sign Up and Login */
              <div className="flex items-center gap-2">
                <Link
                  href={`/${countryCode}/register`}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                  <span>Sign Up</span>
                </Link>
                <Link
                  href={`/${countryCode}/login`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer: Exactly 4 Main Items + Theme + Account */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 shadow-xl">
          {/* Main 4 Links */}
          <div className="space-y-1">
            <Link
              href={`/${countryCode}/webinars/upcoming`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg"
            >
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Upcoming</span>
            </Link>
            <Link
              href={`/${countryCode}/webinars/self-study`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg"
            >
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Self-Study</span>
            </Link>
            {/* 3. Courses by Topics (with mobile expansion) */}
            <div>
              <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg">
                <Link
                  href={`/${countryCode}/courses-by-topics`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 flex-1"
                >
                  <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Courses by Topics</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileTopicsOpen(!mobileTopicsOpen)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-slate-300"
                  aria-label="Toggle topics list"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      mobileTopicsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {mobileTopicsOpen && (
                <div className="pl-7 pr-2 py-1 space-y-1 bg-gray-50/60 dark:bg-slate-800/40 rounded-xl my-1">
                  {TOPIC_NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.slug}
                        href={`/${countryCode}/courses-by-topics/${item.slug}`}
                        onClick={() => {
                          setMobileTopicsOpen(false)
                          setMobileMenuOpen(false)
                        }}
                        className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-md"
                      >
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                  <Link
                    href={`/${countryCode}/courses-by-topics`}
                    onClick={() => {
                      setMobileTopicsOpen(false)
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>View All Topics →</span>
                  </Link>
                </div>
              )}
            </div>
            <Link
              href={`/${countryCode}/subscriptions`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg"
            >
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Subscriptions</span>
            </Link>
          </div>

          {/* Theme Toggle row in mobile */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between px-3 py-1">
            <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">Appearance Mode</span>
            <ThemeToggle showLabel />
          </div>

          {/* Account Section for Mobile */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
            {customer ? (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        Welcome, {displayName}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{customer.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {customerMenuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href={`/${countryCode}/register`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                  Sign Up
                </Link>
                <Link
                  href={`/${countryCode}/login`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
